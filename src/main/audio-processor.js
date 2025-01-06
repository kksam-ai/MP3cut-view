const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 设置 ffmpeg 路径
ffmpeg.setFfmpegPath(ffmpegPath);

class AudioProcessor {
  constructor() {
    // 当前导出任务
    this.currentExportTask = null;
  }

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
          .on('error', (err, stdout, stderr) => {
            console.error('FFmpeg error:', err);
            console.error('FFmpeg stdout:', stdout);
            console.error('FFmpeg stderr:', stderr);
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
   * @param {string} [format] - 强制指定输出格式（可选）
   * @returns {string} 新的文件路径
   */
  generateOutputFileName(originalPath, index, format = null) {
    const parsedPath = path.parse(originalPath);
    const paddedIndex = String(index).padStart(3, '0');

    // 如果指定了格式，使用指定的格式，否则保持原始扩展名
    const extension = format ? `.${format}` : parsedPath.ext;

    const newFileName = `${parsedPath.name}${paddedIndex}${extension}`;
    return path.join(parsedPath.dir, newFileName);
  }

  /**
   * 取消当前导出任务
   */
  cancelExport() {
    if (this.currentExportTask) {
      // 取消 FFmpeg 命令
      if (this.currentExportTask.command) {
        this.currentExportTask.command.kill();
      }

      // 删除已生成的文件
      if (this.currentExportTask.outputFiles) {
        this.currentExportTask.outputFiles.forEach(file => {
          try {
            if (fs.existsSync(file)) {
              fs.unlinkSync(file);
              console.log('已删除文件:', file);
            }
          } catch (error) {
            console.error('删除文件失败:', file, error);
          }
        });
      }

      // 重置任务状态
      this.currentExportTask = null;
    }
  }

  /**
   * 获取音频文件的实际格式信息
   * @param {string} filePath - 文件路径
   * @returns {Promise<{container: string, codec: string, format: string}>} 格式信息
   */
  getAudioFormat(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        if (!metadata.streams || !metadata.streams[0]) {
          reject(new Error('无法检测音频格式'));
          return;
        }

        const stream = metadata.streams[0];
        const format = metadata.format;

        // 详细的格式检测
        let detectedFormat = {
          container: format.format_name,
          codec: stream.codec_name,
          format: 'm4a',  // 默认格式
          fullMetadata: {
            formatName: format.format_name,
            codecName: stream.codec_name,
            codecType: stream.codec_type,
            sampleRate: stream.sample_rate,
            channels: stream.channels,
            bitRate: format.bit_rate
          }
        };

        // 检测实际格式
        if (format.format_name.includes('mp3')) {
          detectedFormat.format = 'mp3';
        } else if (
          format.format_name.includes('m4a') ||
          format.format_name.includes('mov') ||
          format.format_name.includes('mp4') ||
          stream.codec_name === 'aac'
        ) {
          detectedFormat.format = 'm4a';
        }

        // 记录更多格式信息用于调试
        console.log('详细的音频格式信息:', detectedFormat);

        resolve(detectedFormat);
      });
    });
  }

  /**
   * 计算MP3帧时长（秒）
   * @param {number} sampleRate - 采样率（Hz）
   * @returns {number} 帧时长（秒）
   */
  calculateFrameDuration(sampleRate) {
    // MP3 Layer III 每帧固定1152个采样
    const SAMPLES_PER_FRAME = 1152;
    return SAMPLES_PER_FRAME / sampleRate;
  }

  /**
   * 将时间点调整到最近的帧边界
   * @param {number} time - 原始时间点（秒）
   * @param {number} frameDuration - 帧时长（秒）
   * @param {boolean} roundUp - 是否向上取整
   * @returns {number} 调整后的时间点（秒）
   */
  snapToFrameBoundary(time, frameDuration, roundUp = false) {
    const frames = time / frameDuration;
    return (roundUp ? Math.ceil(frames) : Math.floor(frames)) * frameDuration;
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

      // 获取实际的音频格式
      const audioFormat = await this.getAudioFormat(inputPath);
      console.log('检测到的音频格式:', audioFormat);

      // 使用检测到的格式作为输出格式
      const outputFormat = audioFormat.format;

      // 确定是否需要使用copy模式
      const useCopyMode = audioFormat.codec === 'mp3' && outputFormat === 'mp3';

      // 如果使用copy模式，计算帧时长
      let frameDuration;
      if (useCopyMode) {
        frameDuration = this.calculateFrameDuration(audioFormat.fullMetadata.sampleRate);
        console.log('使用copy模式，帧时长:', frameDuration, '秒');
      }

      const totalSegments = segments.length;
      let completedSegments = 0;
      const outputFiles = [];

      // 创建新的导出任务
      this.currentExportTask = {
        outputFiles: outputFiles,
        command: null
      };

      for (const segment of segments) {
        // 如果任务已被取消，抛出错误
        if (!this.currentExportTask) {
          throw new Error('导出已取消');
        }

        // 使用检测到的格式生成输出文件名
        const outputFileName = this.generateOutputFileName(inputPath, segment.index, outputFormat);
        outputFiles.push(outputFileName);

        try {
          // 使用ffmpeg处理单个片段
          await new Promise((resolve, reject) => {
            // 根据模式调整切割时间
            let startTime = segment.startTime;
            let endTime = segment.endTime;

            if (useCopyMode) {
              // 在copy模式下进行帧对齐
              startTime = this.snapToFrameBoundary(startTime, frameDuration, false);
              endTime = this.snapToFrameBoundary(endTime, frameDuration, false);
              console.log('帧对齐后的时间:', {
                original: { start: segment.startTime, end: segment.endTime },
                adjusted: { start: startTime, end: endTime }
              });
            }

            const duration = endTime - startTime;

            console.log(`开始处理片段 ${segment.index}:`, {
              startTime,
              duration,
              outputFile: outputFileName,
              format: audioFormat,
              useCopyMode
            });

            const command = ffmpeg(inputPath)
              .setStartTime(startTime)
              .setDuration(duration)
              .on('start', (commandLine) => {
                console.log(`FFmpeg命令 (片段 ${segment.index}):`, commandLine);
              });

            // 根据实际格式决定处理方式
            if (useCopyMode) {
              // 使用copy模式
              command.outputOptions('-c', 'copy');
            } else if (outputFormat === 'mp3') {
              // 转换为MP3
              command.audioCodec('libmp3lame')
                    .audioBitrate(audioFormat.fullMetadata.bitRate || '320k');
            } else {
              // 转换为AAC (M4A)
              command.audioCodec('aac')
                    .outputOptions('-movflags', '+faststart')  // 优化M4A文件结构
                    .outputOptions('-c:a', 'aac');  // 明确指定AAC编码器
            }

            command.on('progress', (progress) => {
              // 如果任务已被取消，停止处理
              if (!this.currentExportTask) {
                command.kill();
                reject(new Error('导出已取消'));
                return;
              }

              // 确保progress.percent有效，默认为0
              const percent = typeof progress.percent === 'number' ? progress.percent : 0;

              // 规范化片段进度 (0-100)
              const currentProgress = Math.min(100, Math.max(0, percent));

              // 计算总体进度
              const segmentProgress = currentProgress / 100;
              const overallProgress = Math.min(100, Math.round((completedSegments + segmentProgress) / totalSegments * 100));

              progressCallback && progressCallback({
                currentSegment: completedSegments + 1,
                totalSegments,
                currentProgress: currentProgress,
                overallProgress: overallProgress
              });
            });

            command.on('error', (err, stdout, stderr) => {
              console.error(`片段 ${segment.index} 处理失败:`, err);
              console.error('FFmpeg stdout:', stdout);
              console.error('FFmpeg stderr:', stderr);
              reject(new Error(`切割音频失败: ${err.message}\n${stderr || ''}`));
            });

            command.on('end', () => {
              console.log(`片段 ${segment.index} 处理完成`);
              resolve();
            });

            command.save(outputFileName);

            // 保存当前命令实例
            if (this.currentExportTask) {
              this.currentExportTask.command = command;
            }
          });

          completedSegments++;

        } catch (error) {
          console.error('处理片段出错:', error);
          // 如果不是取消导出的错误，则删除已生成的文件
          if (error.message !== '导出已取消') {
            outputFiles.forEach(file => {
              try {
                if (fs.existsSync(file)) {
                  fs.unlinkSync(file);
                }
              } catch (err) {
                console.error('删除文件失败:', err);
              }
            });
          }
          throw error;
        }
      }

      // 清理任务状态
      this.currentExportTask = null;
      return outputFiles;
    } catch (error) {
      // 清理任务状态
      this.currentExportTask = null;
      throw new Error(`音频处理失败: ${error.message}`);
    }
  }
}

module.exports = new AudioProcessor();
