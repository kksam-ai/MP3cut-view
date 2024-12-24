const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 设置 ffmpeg 路径
ffmpeg.setFfmpegPath(ffmpegPath);

class AudioProcessor {
  async convertToWav(filePath) {
    try {
      console.log('Converting audio file:', filePath);

      // 检查文件是否存在和可读
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      await fs.promises.access(filePath, fs.constants.R_OK);

      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `temp_audio_${Date.now()}.wav`);
      console.log('Temp file path:', outputPath);

      return new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .toFormat('wav')
          .on('start', (commandLine) => {
            console.log('FFmpeg command:', commandLine);
          })
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            reject(err);
          })
          .on('end', () => {
            console.log('FFmpeg conversion completed');
            resolve(outputPath);
          })
          .save(outputPath);
      });
    } catch (error) {
      console.error('Error converting audio:', error);
      throw error;
    }
  }
}

module.exports = new AudioProcessor();
