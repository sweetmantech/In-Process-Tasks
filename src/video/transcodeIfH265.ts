import { logger } from '@trigger.dev/sdk/v3';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ffmpeg/ffprobe are installed as system binaries via the ffmpeg() build
// extension in trigger.config.ts — fluent-ffmpeg finds them via PATH.

function probeVideoCodec(filePath: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const videoStream = data.streams.find((s) => s.codec_type === 'video');
      resolve(videoStream?.codec_name ?? null);
    });
  });
}

function transcodeToH264(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-crf 23', '-preset fast', '-movflags +faststart'])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Detects the video codec of a File object using ffprobe.
 * If the codec is H.265 (hevc), transcodes it to H.264 MP4 and returns
 * the new File. Otherwise returns the original File unchanged.
 */
export async function transcodeIfH265(videoFile: File): Promise<File> {
  const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const inputPath = join(tmpdir(), `transcode-input-${id}.mp4`);
  const outputPath = join(tmpdir(), `transcode-output-${id}.mp4`);

  try {
    // Write File buffer to disk so ffprobe/ffmpeg can read it
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    await fs.writeFile(inputPath, buffer);

    const codec = await probeVideoCodec(inputPath);

    logger.log('Video codec detected', {
      fileName: videoFile.name,
      codec,
    });

    if (codec !== 'hevc') {
      logger.log('No transcode needed', { fileName: videoFile.name, codec });
      return videoFile;
    }

    logger.log('H.265 detected, transcoding to H.264', {
      fileName: videoFile.name,
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
