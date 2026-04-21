import { logger } from '@trigger.dev/sdk/v3';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { probeVideo } from './probeVideo';
import { transcodeToH264 } from './transcodeToH264';

// ffmpeg/ffprobe are installed as system binaries via the ffmpeg() build
// extension in trigger.config.ts — fluent-ffmpeg finds them via PATH.

/**
 * Inspects the video with ffprobe and transcodes to H.264 if:
 *  - codec is H.265 (hevc), or
 *  - codec is H.264 with no B-frames and size > 50 MB
 *
 * Otherwise returns the original File unchanged.
 */
export async function transcodeIfH265(videoFile: File): Promise<File> {
  const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const inputPath = join(tmpdir(), `transcode-input-${id}.mp4`);
  const outputPath = join(tmpdir(), `transcode-output-${id}.mp4`);

  try {
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    await fs.writeFile(inputPath, buffer);

    const probe = await probeVideo(inputPath);

    logger.log('Video probe result', {
      fileName: videoFile.name,
      codec: probe.codec,
      needsReencode: probe.needsReencode,
      reason: probe.reason,
    });

    if (!probe.needsReencode) {
      return videoFile;
    }

    logger.log('Transcoding to H.264', {
      fileName: videoFile.name,
      reason: probe.reason,
      fileSizeMB: (videoFile.size / (1024 * 1024)).toFixed(2),
    });

    const transcodeStart = Date.now();
    await transcodeToH264(inputPath, outputPath);
    const transcodeSeconds = ((Date.now() - transcodeStart) / 1000).toFixed(2);

    const transcodedBuffer = await fs.readFile(outputPath);
    const transcodedName = videoFile.name.replace(/\.[^.]+$/, '.mp4');
    const transcodedFile = new File([transcodedBuffer], transcodedName, {
      type: 'video/mp4',
    });

    logger.log('Transcode completed', {
      fileName: videoFile.name,
      originalSizeMB: (videoFile.size / (1024 * 1024)).toFixed(2),
      transcodedSizeMB: (transcodedFile.size / (1024 * 1024)).toFixed(2),
      transcodeTimeSeconds: transcodeSeconds,
    });

    return transcodedFile;
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
