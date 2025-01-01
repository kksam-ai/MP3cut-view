/**
 * 音频元数据管理模块
 */

/**
 * 音频元数据错误类
 */
class AudioMetadataError extends Error {
  constructor(type, message, details = null) {
    super(message);
    this.name = 'AudioMetadataError';
    this.type = type;
    this.details = details;
  }
}

// 元数据错误类型
const MetadataError = {
  INVALID_FILE: {
    code: 'invalid_file',
    message: '无效的文件对象'
  },
  MISSING_DATA: {
    code: 'missing_data',
    message: '缺少必要的音频数据'
  },
  INVALID_FORMAT: {
    code: 'invalid_format',
    message: '不支持的文件格式'
  },
  PARSE_ERROR: {
    code: 'parse_error',
    message: '音频解析失败'
  },
  VALIDATION_ERROR: {
    code: 'validation_error',
    message: '数据验证失败'
  }
};

/**
 * 创建音频元数据对象
 * @param {File} file - 音频文件对象
 * @param {Object} audioData - 音频解析数据
 * @returns {Object} 不可变的元数据对象
 * @throws {Error} 如果参数无效或数据缺失
 */
function createAudioMetadata(file, audioData) {
  try {
    // 验证文件对象
    const fileValidation = validateFile(file);
    if (!fileValidation.isValid) {
      throw new AudioMetadataError(
        MetadataError.VALIDATION_ERROR.code,
        MetadataError.VALIDATION_ERROR.message,
        fileValidation.errors
      );
    }

    // 验证音频数据
    const audioValidation = validateAudioData(audioData);
    if (!audioValidation.isValid) {
      throw new AudioMetadataError(
        MetadataError.VALIDATION_ERROR.code,
        MetadataError.VALIDATION_ERROR.message,
        audioValidation.errors
      );
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
  } catch (error) {
    // 如果已经是 AudioMetadataError 则直接抛出
    if (error instanceof AudioMetadataError) {
      throw error;
    }
    // 其他错误包装为 AudioMetadataError
    throw new AudioMetadataError(
      MetadataError.PARSE_ERROR.code,
      MetadataError.PARSE_ERROR.message,
      error.message
    );
  }
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

/**
 * 验证音频参数
 * @param {Object} audioData - 音频数据对象
 * @returns {Object} 验证结果 {isValid, errors}
 */
function validateAudioData(audioData) {
  const errors = [];

  // 检查必需字段
  const requiredFields = ['sampleRate', 'duration', 'numberOfChannels', 'waveform'];
  requiredFields.forEach(field => {
    if (audioData[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // 验证数值字段
  if (audioData.sampleRate <= 0) {
    errors.push('Invalid sample rate');
  }
  if (audioData.duration <= 0) {
    errors.push('Invalid duration');
  }
  if (audioData.numberOfChannels <= 0) {
    errors.push('Invalid number of channels');
  }
  if (!audioData.waveform || audioData.waveform.length === 0) {
    errors.push('Invalid waveform data');
  }

  // 验证可选字段的类型
  if (audioData.bitRate && typeof audioData.bitRate !== 'number') {
    errors.push('Invalid bitRate type');
  }
  if (audioData.format && typeof audioData.format !== 'string') {
    errors.push('Invalid format type');
  }
  if (audioData.codec && typeof audioData.codec !== 'string') {
    errors.push('Invalid codec type');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证文件对象
 * @param {File} file - 文件对象
 * @returns {Object} 验证结果 {isValid, errors}
 */
function validateFile(file) {
  const errors = [];

  // 检查文件对象
  if (!file || !(file instanceof File)) {
    errors.push('Invalid file object');
    return { isValid: false, errors };
  }

  // 检查文件属性
  if (!file.name) {
    errors.push('Missing file name');
  }
  if (!file.size || file.size <= 0) {
    errors.push('Invalid file size');
  }
  if (!file.type) {
    errors.push('Missing file type');
  }

  // 检查文件扩展名
  const extension = getExtension(file.name);
  if (!extension) {
    errors.push('Missing file extension');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// 导出模块接口
module.exports = {
  AudioMetadataError,
  MetadataError,
  createAudioMetadata,
  formatFileSize,
  formatDuration,
  formatSampleRate,
  validateAudioData,
  validateFile
};
