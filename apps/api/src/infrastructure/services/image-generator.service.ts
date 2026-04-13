import satori from 'satori';
import * as path from 'path';
import * as fs from 'fs/promises';

function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/[\u{200D}]/gu, '')
    .replace(/[\u{20E3}]/gu, '')
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')
    .trim();
}

export interface CommentData {
  username: string;
  text: string;
  avatarUrl?: string | null;
}

export class ImageGeneratorService {
  private fontData: ArrayBuffer | null = null;
  private boldFontData: ArrayBuffer | null = null;

  private async loadFont(): Promise<ArrayBuffer> {
    if (this.fontData) return this.fontData;

    const cacheDir = path.join(process.cwd(), '.font-cache');
    const cachedFontPath = path.join(cacheDir, 'Inter-Regular.ttf');

    try {
      const cached = await fs.readFile(cachedFontPath);
      this.fontData = cached.buffer as ArrayBuffer;
      return this.fontData;
    } catch {
    }

    console.log('[ImageGen] Downloading Inter font...');
    const fontUrl = 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf';
    const res = await fetch(fontUrl);
    if (!res.ok) throw new Error(`Failed to download font: ${res.status}`);

    this.fontData = await res.arrayBuffer();

    await fs.mkdir(cacheDir, { recursive: true });
    await Bun.write(cachedFontPath, this.fontData);

    return this.fontData;
  }

  private async loadBoldFont(): Promise<ArrayBuffer> {
    if (this.boldFontData) return this.boldFontData;

    const cacheDir = path.join(process.cwd(), '.font-cache');
    const cachedFontPath = path.join(cacheDir, 'Inter-Bold.ttf');

    try {
      const cached = await fs.readFile(cachedFontPath);
      this.boldFontData = cached.buffer as ArrayBuffer;
      return this.boldFontData;
    } catch {
    }

    console.log('[ImageGen] Downloading Inter Bold font...');
    const fontUrl = 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf';
    const res = await fetch(fontUrl);
    if (!res.ok) throw new Error(`Failed to download bold font: ${res.status}`);

    this.boldFontData = await res.arrayBuffer();
    await fs.mkdir(cacheDir, { recursive: true });
    await Bun.write(cachedFontPath, this.boldFontData);

    return this.boldFontData;
  }

  private async fetchAvatarAsBase64(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) return null;

      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${base64}`;
    } catch {
      return null;
    }
  }

  async generateCommentOverlay(
    comments: CommentData[],
    width: number = 1080,
    height: number = 360
  ): Promise<Buffer> {
    const fontData = await this.loadFont();
    const boldFontData = await this.loadBoldFont();
    const avatarPromises = comments.slice(0, 3).map(async (c) => {
      if (c.avatarUrl) {
        return await this.fetchAvatarAsBase64(c.avatarUrl);
      }
      return null;
    });
    const avatarDataUris = await Promise.all(avatarPromises);
    const commentElements = comments.slice(0, 3).map((comment, i) => {
      const avatarDataUri = avatarDataUris[i];
      const avatarElement = avatarDataUri
        ? {
          type: 'img' as const,
          props: {
            src: avatarDataUri,
            width: 64,
            height: 64,
            style: {
              width: '64px',
              height: '64px',
              minWidth: '64px',
              borderRadius: '50%',
              objectFit: 'cover' as const,
            },
          },
        }
        : {
          type: 'div' as const,
          props: {
            style: {
              width: '64px',
              height: '64px',
              minWidth: '64px',
              borderRadius: '50%',
              backgroundColor: this.getAvatarColor(i),
              display: 'flex',
              alignItems: 'center' as const,
              justifyContent: 'center' as const,
              color: 'white',
              fontSize: '28px',
              fontWeight: 700,
            },
            children: comment.username.charAt(0).toUpperCase(),
          },
        };

      return {
        type: 'div' as const,
        props: {
          key: i,
          style: {
            display: 'flex',
            flexDirection: 'row' as const,
            alignItems: 'flex-start' as const,
            padding: '16px 28px',
            gap: '16px',
            width: '100%',
            borderBottom: i < 2 ? '1px solid #E8E8E8' : 'none',
          },
          children: [
            avatarElement,
            {
              type: 'div' as const,
              props: {
                style: {
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: '4px',
                  flex: 1,
                },
                children: [
                  {
                    type: 'span' as const,
                    props: {
                      style: {
                        color: '#161823',
                        fontSize: '26px',
                        fontWeight: 700,
                        fontFamily: 'Inter',
                      },
                      children: `@${comment.username}`,
                    },
                  },
                  {
                    type: 'span' as const,
                    props: {
                      style: {
                        color: '#161823',
                        fontSize: '28px',
                        fontWeight: 400,
                        fontFamily: 'Inter',
                        lineHeight: '1.4',
                      },
                      children: (() => {
                        const clean = stripEmoji(comment.text);
                        return clean.length > 80 ? clean.substring(0, 80) + '...' : clean;
                      })(),
                    },
                  },
                ],
              },
            },
          ],
        },
      };
    });
    const element = {
      type: 'div' as const,
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          width: '100%',
          height: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '0px',
          padding: '12px 0',
        },
        children: commentElements,
      },
    };
    const svg = await satori(element as any, {
      width,
      height,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          weight: 400,
          style: 'normal' as const,
        },
        {
          name: 'Inter',
          data: boldFontData,
          weight: 700,
          style: 'normal' as const,
        },
      ],
    });
    const { Resvg } = await import('@resvg/resvg-js');
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width' as const, value: width },
    });
    const pngData = resvg.render();
    return Buffer.from(pngData.asPng());
  }

  async generateAndSave(
    comments: CommentData[],
    outputDir: string,
    jobId: string,
    width: number = 1080,
    height: number = 360
  ): Promise<string> {
    const pngBuffer = await this.generateCommentOverlay(comments, width, height);

    const outputPath = path.join(outputDir, `${jobId}_comments.png`);
    await Bun.write(outputPath, pngBuffer);

    console.log(`[ImageGen] Comment overlay saved: ${outputPath}`);
    return outputPath;
  }

  private getAvatarColor(index: number): string {
    const colors = [
      '#FE2C55',
      '#25F4EE',
      '#5B5FC7',
    ];
    return colors[index % colors.length]!;
  }
}
