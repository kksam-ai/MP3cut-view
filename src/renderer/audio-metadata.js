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
 * 深度冻结对象及其所有嵌套属性
 * @param {Object} obj - 需要冻结的对象
 * @returns {Object} 被冻结的对象
 */
function deepFreeze(obj) {
  // 获取所有属性，包括不可枚举的
  const propNames = Object.getOwnPropertyNames(obj);

  // 在冻结自身之前先冻结属性
  propNames.forEach(name => {
    const prop = obj[name];

    // 如果prop是对象且不为null，则递归冻结
    if (prop && typeof prop === 'object' && !Array.isArray(prop)) {
      deepFreeze(prop);
    }
  });

  // 冻结自身
  return Object.freeze(obj);
}

/**
 * 验证元数据对象的不可变性
 * @param {Object} metadata - 元数据对象
 * @throws {Error} 如果发现可变对象则抛出错误
 */
function validateMetadataImmutability(metadata) {
  if (!Object.isFrozen(metadata)) {
    throw new Error('Metadata object is not frozen');
  }

  Object.entries(metadata).forEach(([key, value]) => {
    if (value && typeof value === 'object') {
      if (!Object.isFrozen(value)) {
        throw new Error(`Nested object "${key}" is not frozen`);
      }
      // 递归检查嵌套对象
      validateMetadataImmutability(value);
    }
  });
}

/**
 * 创建音频元数据对象
 * @param {File} file - 音频文件对象
 * @param {Object} audioData - 音频解析数据
 * @returns {Object} 不可变的元数据对象
 * @throws {Error} 如果参数无效或数据缺失
 */
function createAudioMetadata(file, audioData) {
  // 验证输入
  const fileValidation = validateFile(file);
  if (!fileValidation.isValid) {
    throw new Error(`Invalid file: ${fileValidation.errors.join(', ')}`);
  }

  const audioValidation = validateAudioData(audioData);
  if (!audioValidation.isValid) {
    throw new Error(`Invalid audio data: ${audioValidation.errors.join(', ')}`);
  }

  // 创建元数据对象
  const metadata = {
    fileMetadata: {
      name: file.name,
      path: file.path,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified)
    },
    audioParams: {
      sampleRate: audioData.sampleRate,
      duration: audioData.duration,
      numberOfChannels: audioData.numberOfChannels,
      bitRate: audioData.bitRate,
      format: audioData.format,
      codec: audioData.codec
    },
    tags: audioData.tags || {}
  };

  // 深度冻结对象
  const frozenMetadata = deepFreeze(metadata);

  // 在开发环境下验证不可变性
  if (process.env.NODE_ENV === 'development') {
    validateMetadataImmutability(frozenMetadata);
  }

  return frozenMetadata;
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
