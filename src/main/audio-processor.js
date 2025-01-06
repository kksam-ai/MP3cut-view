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

  /**
   * 生成输出文件名
   * @param {string} originalPath - 原始文件路径
   * @param {number} index - 片段序号
   * @returns {string} 新的文件路径
   */
  generateOutputFileName(originalPath, index) {
    const parsedPath = path.parse(originalPath);
    const paddedIndex = String(index).padStart(3, '0');
    const newFileName = `${parsedPath.name}${paddedIndex}${parsedPath.ext}`;
    return path.join(parsedPath.dir, newFileName);
  }

  /**
   * 切割音频文件
   * @param {string} inputPath - 输入文件路径
   * @param {Array<{startTime: number, endTime: number}>} segments - 切割片段列表
   * @param {Function} progressCallback - 进度回调函数
   * @returns {Promise<Array<string>>} 输出文件路径列表
   */
  async splitAudio(inputPath, segments, progressCallback) {
    try {
      // 检查输入文件
      if (!fs.existsSync(inputPath)) {
        throw new Error('输入文件不存在');
      }

      const outputFiles = [];
      let totalProgress = 0;
      const segmentCount = segments.length;

      // 处理每个片段
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const duration = segment.endTime - segment.startTime;
        const outputPath = this.generateOutputFileName(inputPath, i + 1);

        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .setStartTime(segment.startTime)
            .setDuration(duration)
            .output(outputPath)
            .outputOptions(['-c copy']) // 使用复制模式，保持原始质量
            .on('progress', (progress) => {
              // 计算总体进度
              const segmentProgress = progress.percent / 100;
              const overallProgress = (i + segmentProgress) / segmentCount * 100;
              progressCallback && progressCallback({
                currentSegment: i + 1,
                totalSegments: segmentCount,
                currentProgress: progress.percent,
                overallProgress: Math.min(overallProgress, 100)
              });
            })
            .on('error', (err) => {
              reject(new Error(`切割音频失败: ${err.message}`));
            })
            .on('end', () => {
              outputFiles.push(outputPath);
              resolve();
            })
            .run();
        });
      }

      return outputFiles;
    } catch (error) {
      throw new Error(`音频处理失败: ${error.message}`);
    }
  }
}

module.exports = new AudioProcessor();
