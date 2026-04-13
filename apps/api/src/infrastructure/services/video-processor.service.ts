import * as path from 'path';
import * as fs from 'fs/promises';

export interface WatermarkConfig {
  type: 'text' | 'image';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  text?: string;
  fontSize?: number;
  color?: string;
  imageUrl?: string;
  imagePath?: string;
  scale?: number;
}

export interface PresetConfig {
  foregroundScale: number;
  blurStrength: number;
  foregroundPosition: 'top-center';
  commentOverlayPath?: string;
  watermarks?: WatermarkConfig[];
}

export const DEFAULT_PRESET: PresetConfig = {
  foregroundScale: 0.6,
  blurStrength: 15,
  foregroundPosition: 'top-center',
};

export class VideoProcessorService {

  private getFfmpegPath(): string {
    const fromEnv = process.env.FFMPEG_PATH?.trim();
    return fromEnv && fromEnv.length > 0 ? fromEnv : 'ffmpeg';
  }

  private getTextPositionCoords(position: WatermarkConfig['position']): { x: string; y: string } {
    const pad = 30;
    const positions: Record<WatermarkConfig['position'], { x: string; y: string }> = {
      'top-left': { x: `${pad}`, y: `${pad}` },
      'top-right': { x: `w-tw-${pad}`, y: `${pad}` },
      'bottom-left': { x: `${pad}`, y: `h-th-${pad}` },
      'bottom-right': { x: `w-tw-${pad}`, y: `h-th-${pad}` },
      'center': { x: `(w-tw)/2`, y: `(h-th)/2` },
    };
    return positions[position];
  }

  private getImagePositionCoords(position: WatermarkConfig['position']): { x: string; y: string } {
    const pad = 30;
    const positions: Record<WatermarkConfig['position'], { x: string; y: string }> = {
      'top-left': { x: `${pad}`, y: `${pad}` },
      'top-right': { x: `main_w-overlay_w-${pad}`, y: `${pad}` },
      'bottom-left': { x: `${pad}`, y: `main_h-overlay_h-${pad}` },
      'bottom-right': { x: `main_w-overlay_w-${pad}`, y: `main_h-overlay_h-${pad}` },
      'center': { x: `(main_w-overlay_w)/2`, y: `(main_h-overlay_h)/2` },
    };
    return positions[position];
  }

  private getFontPath(): string {
    const fontPath = path.join(process.cwd(), '.font-cache', 'Inter-Regular.ttf');
    return fontPath.replace(/\\/g, '/').replace(/:/g, '\\\\:');
  }

  private buildWatermarkFilters(
    watermarks: WatermarkConfig[],
    inputLabel: string,
    baseInputIndex: number = 2
  ): { filters: string[]; outputLabel: string; imageInputPaths: string[] } {
    if (!watermarks || watermarks.length === 0) {
      return { filters: [], outputLabel: inputLabel, imageInputPaths: [] };
    }

    const fontPath = this.getFontPath();
    const filters: string[] = [];
    const imageInputPaths: string[] = [];
    let currentLabel = inputLabel;
    let imageInputIdx = baseInputIndex;

    watermarks.forEach((wm, i) => {
      const outputLabel = `wm${i}`;

      if (wm.type === 'image' && wm.imagePath) {
        const scale = wm.scale || 0.15;
        const imgW = Math.round(1080 * scale);
        const { x, y } = this.getImagePositionCoords(wm.position);
        const scaleLabel = `imgscaled${i}`;
        filters.push(`[${imageInputIdx}:v]scale=${imgW}:-1[${scaleLabel}]`);
        filters.push(`[${currentLabel}][${scaleLabel}]overlay=${x}:${y}[${outputLabel}]`);

        imageInputPaths.push(wm.imagePath);
        imageInputIdx++;
      } else if (wm.type === 'text' && wm.text) {
        const { x, y } = this.getTextPositionCoords(wm.position);
        const fontSize = wm.fontSize || 24;
        const color = wm.color || 'white';

        const escapedText = wm.text
          .replace(/\\/g, '\\\\\\\\')
          .replace(/'/g, "'\\\\\\''")
          .replace(/:/g, '\\\\:')
          .replace(/%/g, '%%');

        const filter = `[${currentLabel}]drawtext=fontfile='${fontPath}':text='${escapedText}':fontsize=${fontSize}:fontcolor=${color}:x=${x}:y=${y}:shadowcolor=black@0.6:shadowx=2:shadowy=2[${outputLabel}]`;
        filters.push(filter);
      } else {
        return;
      }

      currentLabel = outputLabel;
    });

    return { filters, outputLabel: currentLabel, imageInputPaths };
  }

  async applyPreset(
    inputVideoPath: string,
    commentOverlayPath: string,
    outputPath: string,
    preset: PresetConfig = DEFAULT_PRESET
  ): Promise<{ outputPath: string; fileSizeBytes: number }> {

    const ffmpegPath = this.getFfmpegPath();

    console.log(`[VideoProcessor] Starting preset processing...`);
    console.log(`  Input:    ${inputVideoPath}`);
    console.log(`  Overlay:  ${commentOverlayPath}`);
    console.log(`  Output:   ${outputPath}`);
    if (preset.watermarks?.length) {
      const textCount = preset.watermarks.filter(w => w.type === 'text').length;
      const imageCount = preset.watermarks.filter(w => w.type === 'image').length;
      console.log(`  Watermarks: ${textCount} text, ${imageCount} image`);
    }

    return new Promise((resolve, reject) => {
      const canvasW = 1080;
      const canvasH = 1920;
      const fgW = Math.round(canvasW * preset.foregroundScale);
      const fgX = Math.round((canvasW - fgW) / 2);
      const fgY = Math.round(canvasH * 0.04);
      const fgH = Math.round(fgW * 16 / 9);
      const commentY = fgY + fgH;
      const baseFilters = [
        `[0:v]scale=${canvasW}:${canvasH}:force_original_aspect_ratio=increase,crop=${canvasW}:${canvasH},boxblur=${preset.blurStrength}:${preset.blurStrength}[bg]`,
        `[0:v]scale=${fgW}:-1[fg]`,
        `[bg][fg]overlay=${fgX}:${fgY}[main]`,
        `[main][1:v]overlay=${fgX}:${commentY}[composed]`,
      ];
      const { filters: wmFilters, outputLabel, imageInputPaths } = this.buildWatermarkFilters(
        preset.watermarks || [],
        'composed',
        2
      );

      const allFilters = [...baseFilters, ...wmFilters];
      const filterComplex = allFilters.join(';');

      const args = [
        '-y',
        '-i', inputVideoPath,
        '-i', commentOverlayPath,
      ];
      for (const imgPath of imageInputPaths) {
        args.push('-i', imgPath);
      }
      
      args.push('-filter_complex', filterComplex);
      args.push('-map', `[${outputLabel}]`);
      args.push('-map', '0:a?');
      args.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-shortest'
      );
      args.push(outputPath);

      console.log(`[VideoProcessor] Running: ${ffmpegPath} ${args.join(' ')}`);

      try {
        const proc = Bun.spawn([ffmpegPath, ...args], {
          stdout: 'ignore',
          stderr: 'pipe',
        });
        
        let errorOutput = '';
        const reader = proc.stderr.getReader();

        // Background read stderr
        (async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = new TextDecoder().decode(value);
            errorOutput += text;
          }
        })();

        proc.exited.then(async (exitCode) => {
          if (exitCode !== 0) {
            console.error(`[VideoProcessor] ❌ FFmpeg error exit: ${exitCode}\n${errorOutput.slice(-1000)}`);
            reject(new Error(`FFmpeg processing failed with code ${exitCode}`));
            return;
          }

          console.log(`[VideoProcessor] ✅ Processing complete: ${outputPath}`);
          try {
            const stat = await fs.stat(outputPath);
            resolve({ outputPath, fileSizeBytes: stat.size });
          } catch (err) {
            reject(new Error(`Output file not found after processing: ${outputPath}`));
          }
        }).catch(reject);

      } catch (err) {
        console.error(`[VideoProcessor] ❌ Failed to spawn FFmpeg:`, err);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const proc = Bun.spawn([this.getFfmpegPath(), '-version'], {
          stdout: 'pipe',
          stderr: 'pipe',
        });

        proc.exited.then((code) => {
          resolve(code === 0);
        }).catch(() => {
          resolve(false);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }
}
