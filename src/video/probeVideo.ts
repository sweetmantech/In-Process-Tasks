import ffmpeg, { FfprobeStream } from 'fluent-ffmpeg';

export interface VideoProbeResult {
  codec: string | null;
  needsReencode: boolean;
  reason: string;
}

export function probeVideo(filePath: string): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);

      const videoStream = data.streams.find(
        (s: FfprobeStream) => s.codec_type === 'video'
      );
      if (!videoStream) {
        return resolve({
          codec: null,
          needsReencode: false,
          reason: 'no video stream',
        });
      }

      const codec = videoStream.codec_name ?? null;

      if (codec === 'hevc') {
        return resolve({ codec, needsReencode: true, reason: 'H.265 codec' });
      }

      if (codec === 'h264') {
        const hasNoB = videoStream.has_b_frames === 0;
        const fileSizeMB = data.format.size
          ? Number(data.format.size) / (1024 * 1024)
          : 0;

        if (hasNoB && fileSizeMB > 50) {
          return resolve({
            codec,
            needsReencode: true,
            reason: `inefficient H.264 (no B-frames, ${fileSizeMB.toFixed(1)} MB)`,
          });
        }

        return resolve({
          codec,
          needsReencode: false,
          reason: `H.264 OK (has_b_frames=${videoStream.has_b_frames}, ${fileSizeMB.toFixed(1)} MB)`,
        });
      }

      resolve({
        codec,
        needsReencode: false,
        reason: `codec ${codec} not targeted`,
      });
    });
  });
}
