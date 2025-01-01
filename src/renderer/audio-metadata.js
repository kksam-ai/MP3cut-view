/**
 * 音频元数据管理模块
 */

// 元数据错误类型
const MetadataError = {
  INVALID_FILE: 'invalid_file',
  MISSING_DATA: 'missing_data',
  PARSE_ERROR: 'parse_error'
};

/**
 * 创建音频元数据对象
 * @param {File} file - 音频文件对象
 * @param {Object} audioData - 音频解析数据
 * @returns {Object} 不可变的元数据对象
 * @throws {Error} 如果参数无效或数据缺失
 */
function createAudioMetadata(file, audioData) {
  // 验证参数
  if (!file || !(file instanceof File)) {
    throw new Error('Invalid file object');
  }

  if (!audioData) {
    throw new Error('Missing audio data');
  }

  // 提取文件信息
  const fileMetadata = {
    name: file.name,                      // 文件名
    path: file.path,                      // 完整路径
    directory: getDirectory(file.path),    // 目录路径
    size: file.size,                      // 文件大小
    type: file.type,                      // MIME类型
    extension: getExtension(file.name),    // 扩展名
    lastModified: new Date(file.lastModified) // 修改时间
  };

  // 提取音频参数
  const audioParams = {
    sampleRate: audioData.sampleRate || 0,
    bitRate: audioData.bitRate || 0,
    channels: audioData.channels || 0,
    codec: audioData.codec || '',
    duration: audioData.duration || 0,
    format: audioData.format || ''
  };

  // 提取标签信息(如果有)
  const tags = {
    title: audioData.tags?.title || '',
    artist: audioData.tags?.artist || '',
    album: audioData.tags?.album || '',
    year: audioData.tags?.year || ''
  };

  // 创建元数据对象
  const metadata = {
    fileMetadata: Object.freeze(fileMetadata),
    audioParams: Object.freeze(audioParams),
    tags: Object.freeze(tags)
  };

  // 返回不可变对象
  return Object.freeze(metadata);
}

/**
 * 从文件路径中提取目录
 * @param {string} path - 文件路径
 * @returns {string} 目录路径
 */
function getDirectory(path) {
  if (!path) return '';
  const lastSeparator = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return lastSeparator > -1 ? path.slice(0, lastSeparator) : '';
}

/**
 * 从文件名中提取扩展名
 * @param {string} filename - 文件名
 * @returns {string} 扩展名(包含点号)
 */
function getExtension(filename) {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  return lastDot > -1 ? filename.slice(lastDot) : '';
}

// 添加格式化函数
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(seconds) {
  if (seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}:${pad(ms)}`;
}

function formatSampleRate(sampleRate) {
  return `${(sampleRate / 1000).toFixed(1)} kHz`;
}

// 导出模块接口
module.exports = {
  MetadataError,
  createAudioMetadata,
  formatFileSize,
  formatDuration,
  formatSampleRate
};
