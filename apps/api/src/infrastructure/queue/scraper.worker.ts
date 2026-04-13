import { Worker, Job } from 'bullmq';
import { redisConnection } from '../database/redis';
import { scraperQueueName } from './scraper.queue';
import { TikWMService } from '../services/tikwm.service';
import { ImageGeneratorService } from '../services/image-generator.service';
import type { CommentData } from '../services/image-generator.service';
import { VideoProcessorService, DEFAULT_PRESET } from '../services/video-processor.service';
import type { WatermarkConfig } from '../services/video-processor.service';
import { DrizzleScrapingJobRepository, DrizzleAccountRepository } from '../repositories/drizzle-repositories';
import fs from 'fs/promises';
import path from 'path';

export let scraperWorker: Worker | null = null;

if (process.env.NODE_ENV !== 'test') {
    const tikwm = new TikWMService();
    const jobRepo = new DrizzleScrapingJobRepository();
    const accountRepo = new DrizzleAccountRepository();
    const imageGen = new ImageGeneratorService();
    const videoProcessor = new VideoProcessorService();

    try {
    scraperWorker = new Worker(scraperQueueName, async (job: Job) => {
        const { jobId, accountId, keyword, config } = job.data;

        console.log(`[WORKER] Initiating job ${jobId} for keyword: ${keyword}`);
        await jobRepo.updateJobStatus(jobId, 'processing');

        try {
            const videos = await tikwm.searchVideosAll(keyword, 3);

            if (!videos || videos.length === 0) {
                throw new Error(`No videos found for keyword: ${keyword}`);
            }

            const targetVideo = videos[0];
            const dir = path.join(process.cwd(), 'downloads');
            await fs.mkdir(dir, { recursive: true });
            const accountSlug = accountId.slice(0, 8);
            const fileName = `${targetVideo.video_id}_${targetVideo.author.unique_id}_${accountSlug}.mp4`;
            const filePath = path.join(dir, fileName);
            const allComments = await tikwm.getCommentsAll(targetVideo.author.unique_id, targetVideo.video_id, 3);
            const comments = allComments.slice(0, 3);
            const sizeBytes = await tikwm.downloadVideo(targetVideo.play, filePath);
            let processedFilePath: string | null = null;
            let totalSizeBytes = sizeBytes;
            const ffmpegReady = await videoProcessor.isAvailable();

            if (ffmpegReady && comments.length > 0) {
                console.log(`[WORKER] Applying default preset to video...`);

                try {
                    let watermarks: WatermarkConfig[] = [];
                    const tempImagePaths: string[] = [];
                    if (config) {
                        try {
                            const parsed = JSON.parse(config);
                            if (parsed.watermarks && Array.isArray(parsed.watermarks)) {
                                watermarks = parsed.watermarks;
                                console.log(`[WORKER] Found ${watermarks.length} watermark(s) in config`);
                                for (let i = 0; i < watermarks.length; i++) {
                                    const wm = watermarks[i];
                                    if (!wm) continue;
                                    if (wm.type === 'image' && wm.imageUrl) {
                                        try {
                                            console.log(`[WORKER] Downloading watermark image: ${wm.imageUrl}`);
                                            const imgRes = await fetch(wm.imageUrl);
                                            if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
                                            const imgBuffer = await imgRes.arrayBuffer();
                                            const contentType = imgRes.headers.get('content-type') || '';
                                            const ext = contentType.includes('png') ? 'png' : 'jpg';
                                            const imgPath = path.join(dir, `${jobId}_wm_${i}.${ext}`);
                                            await Bun.write(imgPath, imgBuffer);
                                            watermarks[i] = { ...wm, imagePath: imgPath } as WatermarkConfig;
                                            tempImagePaths.push(imgPath);
                                            console.log(`[WORKER] Watermark image saved: ${imgPath}`);
                                        } catch (imgErr: any) {
                                            console.warn(`[WORKER] Failed to download watermark image ${i}: ${imgErr.message}, skipping`);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn(`[WORKER] Failed to parse job config, ignoring watermarks`);
                        }
                    }

                    const jobPreset = {
                        ...DEFAULT_PRESET,
                        watermarks: watermarks.length > 0 ? watermarks : undefined,
                    };
                    const commentData: CommentData[] = comments.map((c: any) => ({
                        username: c.author || 'user',
                        text: c.text || '',
                        avatarUrl: c.avatar || null,
                    }));
                    const fgW = Math.round(1080 * jobPreset.foregroundScale);
                    const overlayPath = await imageGen.generateAndSave(commentData, dir, jobId, fgW, 360);
                    const processedFileName = `${targetVideo.video_id}_${accountSlug}_processed.mp4`;
                    const processedPath = path.join(dir, processedFileName);
                    const result = await videoProcessor.applyPreset(filePath, overlayPath, processedPath, jobPreset);
                    processedFilePath = result.outputPath;
                    totalSizeBytes += result.fileSizeBytes;
                    await fs.unlink(overlayPath).catch(() => { });
                    for (const tmpImg of tempImagePaths) {
                        await fs.unlink(tmpImg).catch(() => { });
                    }
                    console.log(`[WORKER] Preset applied successfully. Processed: ${result.fileSizeBytes} bytes`);
                } catch (err: any) {
                    console.error(`[WORKER] Preset processing failed (original video kept): ${err.message}`);
                }
            } else if (!ffmpegReady) {
                console.log(`[WORKER] FFmpeg not available, skipping preset processing.`);
            }

            const metadata = JSON.stringify({
                videoDetails: targetVideo,
                fetchedComments: comments
            });

            await jobRepo.updateJobStatus(jobId, 'completed', {
                videoUrl: targetVideo.play,
                filePath,
                fileSizeBytes: sizeBytes,
                metadata,
                processedFilePath,
                presetId: processedFilePath ? 'default' : null,
            });
            await accountRepo.updateStorage(accountId, totalSizeBytes);

            console.log(`[WORKER] SUCCESS job ${jobId}. Downloaded ${sizeBytes} bytes.${processedFilePath ? ` Processed: ${totalSizeBytes - sizeBytes} bytes.` : ''}`);

        } catch (error: any) {
            console.error(`[WORKER] FAILED job ${jobId}: ${error.message}`);
            throw error;
        }

    }, {
        connection: redisConnection,
        concurrency: 5
    });

    scraperWorker.on('error', (err: Error) => {
        console.error('[WORKER] BullMQ worker error:', err);
    });

    scraperWorker.on('failed', async (job, err) => {
        if (!job) return;
        const { jobId, accountId } = job.data;
        if (!job.opts.attempts || job.attemptsMade >= job.opts.attempts) {
            console.log(`[WORKER] Max retries hit for job ${jobId}. REFUNDING credit...`);
            await jobRepo.updateJobStatus(jobId, 'failed', { errorMessage: err.message });
            await accountRepo.addCredits(accountId, 1, `Refund for failed Job ${jobId}`);
        }
    });
    console.log('[WORKER] BullMQ worker listening for jobs');
    } catch (e) {
        console.error('[WORKER] Failed to start BullMQ worker (API will still run):', e);
        scraperWorker = null;
    }
}