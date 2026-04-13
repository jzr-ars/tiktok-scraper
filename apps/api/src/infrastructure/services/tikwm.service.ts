import { AppError } from '@/shared/errors/app-error';

const BASE = "https://tikwm.com/api";
const RATE_LIMIT_DELAY = 1000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class TikWMService {

    async searchVideosAll(keyword: string, maxPages = 5) {
        let allVideos: any[] = [];
        let cursor = 0;
        let hasMore = true;
        let page = 0;

        while (hasMore && page < maxPages) {
            const result = await this.searchVideos(keyword, 20, cursor);

            allVideos = allVideos.concat(result.videos);
            cursor = result.cursor;
            hasMore = result.hasMore;
            page++;
            if (hasMore && page < maxPages) {
                await sleep(RATE_LIMIT_DELAY);
            }
        }
        return allVideos.sort((a, b) => b.play_count - a.play_count);
    }

    async searchVideos(keyword: string, count = 20, cursor = 0) {
        const res = await fetch(`${BASE}/feed/search`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                keywords: keyword,
                count: String(count),
                cursor: String(cursor)
            })
        });

        if (!res.ok) throw new AppError(`TikWM HTTP error: ${res.status}`, 502);

        const json = await res.json() as any;

        if (!json || json.code === -1 || !json.data?.videos) {
            throw new AppError(`TikWM Search failed for keyword "${keyword}": ${json?.msg}`, 502);
        }

        return {
            videos: json.data.videos,
            cursor: json.data.cursor,
            hasMore: json.data.hasMore
        };
    }

    async getCommentsAll(uniqueId: string, videoId: string, maxPages = 3) {
        let allComments: any[] = [];
        let cursor = 0;
        let hasMore = true;
        let page = 0;

        while (hasMore && page < maxPages) {
            await sleep(RATE_LIMIT_DELAY);

            const url = `https://www.tiktok.com/@${uniqueId}/video/${videoId}`;
            const res = await fetch(`${BASE}/comment/list`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ url, count: "20", cursor: String(cursor) })
            });

            if (!res.ok) throw new AppError(`TikWM HTTP error: ${res.status}`, 502);

            const json = await res.json() as any;

            if (!json || json.code === -1) {
                throw new AppError(`TikWM Comment failed for video ${videoId}: ${json?.msg}`, 502);
            }

            const comments = (json.data?.comments ?? []).map((c: any) => ({
                id: c.id || c.cid,
                text: c.text,
                likes: c.digg_count || 0,
                author: c.user?.unique_id,
                avatar: c.user?.avatar || null,
                created_at: c.create_time
            }));

            allComments = allComments.concat(comments);
            cursor = json.data?.cursor ?? 0;
            hasMore = json.data?.hasMore ?? false;
            page++;
        }

        return allComments.sort((a, b) => b.likes - a.likes);
    }

    async getComments(uniqueId: string, videoId: string, count = 5) {
        await sleep(RATE_LIMIT_DELAY);

        const url = `https://www.tiktok.com/@${uniqueId}/video/${videoId}`;
        const res = await fetch(`${BASE}/comment/list`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ url, count: String(count), cursor: "0" })
        });

        if (!res.ok) throw new AppError(`TikWM HTTP error: ${res.status}`, 502);

        const json = await res.json() as any;

        if (!json || json.code === -1) {
            throw new AppError(`TikWM Comment failed for video ${videoId}: ${json?.msg}`, 502);
        }

        const formattedComments = (json.data?.comments ?? []).map((c: any) => ({
            id: c.id || c.cid,
            text: c.text,
            likes: c.digg_count || 0,
            author: c.user?.unique_id,
            avatar: c.user?.avatar || null,
            created_at: c.create_time
        }));
        return formattedComments.sort((a: any, b: any) => b.likes - a.likes);
    }

    async downloadVideo(playUrl: string, filepath: string): Promise<number> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60_000);

        try {
            const res = await fetch(playUrl, { signal: controller.signal });
            if (!res.ok) throw new AppError(`Failed to download video: ${res.status}`, 502);

            const arrayBuffer = await res.arrayBuffer();
            await Bun.write(filepath, arrayBuffer);

            return arrayBuffer.byteLength;
        } catch (err: any) {
            if (err.name === 'AbortError') {
                throw new AppError('Video download timed out after 60 seconds', 504);
            }
            throw err;
        } finally {
            clearTimeout(timeout);
        }
    }

    buildVideoUrl(uniqueId: string, videoId: string): string {
        return `https://www.tiktok.com/@${uniqueId}/video/${videoId}`;
    }
}