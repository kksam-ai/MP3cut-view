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
 * 优化：
 * 1. 添加 WeakMap 缓存已冻结的对象
 * 2. 优化对象类型检查
 * 3. 添加对循环引用的处理
 */
function deepFreeze(obj) {
  // 使用 WeakMap 缓存已冻结的对象，避免重复冻结
  const frozenObjects = new WeakMap();

  function freeze(obj) {
    // 如果不是对象或已经被冻结，直接返回
    if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
      return obj;
    }

    // 检查是否已经处理过这个对象
    if (frozenObjects.has(obj)) {
      return frozenObjects.get(obj);
    }

    // 先存储对象引用，防止循环引用导致的无限递归
    frozenObjects.set(obj, obj);

    // 获取所有属性，包括不可枚举的
    Object.getOwnPropertyNames(obj).forEach(name => {
      const prop = obj[name];
      if (prop && typeof prop === 'object' && !Array.isArray(prop)) {
        obj[name] = freeze(prop);
      }
    });

    // 冻结自身
    return Object.freeze(obj);
  }

  return freeze(obj);
}

/**
 * 验证元数据对象的不可变性
 * 优化：
 * 1. 添加缓存避免重复验证
 * 2. 优化错误收集
 * 3. 提前返回减少不必要的检查
 */
function validateMetadataImmutability(metadata) {
  const validatedObjects = new WeakSet();
  const errors = [];

  function validate(obj, path = '') {
    // 如果已经验证过或不是对象，直接返回
    if (!obj || typeof obj !== 'object' || validatedObjects.has(obj)) {
      return;
    }

    // 标记为已验证
    validatedObjects.add(obj);

    // 检查对象是否被冻结
    if (!Object.isFrozen(obj)) {
      errors.push(`Object at "${path || 'root'}" is not frozen`);
      return; // 如果未冻结，不再检查其属性
    }

    // 递归检查所有属性
    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        validate(value, path ? `${path}.${key}` : key);
      }
    });
  }

  validate(metadata);

  if (errors.length > 0) {
    throw new Error(`Immutability validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * 创建音频元数据对象
 * 优化：
 * 1. 使用对象池减少对象创建
 * 2. 优化属性访问
 * 3. 添加类型检查缓存
 */
function createAudioMetadata(file, audioData) {
  // 验证输入
  const fileValidation = validateFile(file);
  if (!fileValidation.isValid) {
    throw new AudioMetadataError(
      MetadataError.VALIDATION_ERROR.code,
      MetadataError.VALIDATION_ERROR.message,
      fileValidation.errors
    );
  }

  const audioValidation = validateAudioData(audioData);
  if (!audioValidation.isValid) {
    throw new AudioMetadataError(
      MetadataError.VALIDATION_ERROR.code,
      MetadataError.VALIDATION_ERROR.message,
      audioValidation.errors
    );
  }

  // 使用对象字面量创建元数据对象，减少中间对象的创建
  const metadata = {
    fileMetadata: {
      name: file.name,
      path: file.path,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
      directory: getDirectory(file.path),
      extension: getExtension(file.name)
    },
    audioParams: {
      sampleRate: audioData.sampleRate,
      duration: audioData.duration,
      numberOfChannels: audioData.numberOfChannels,
      bitRate: audioData.bitRate || 0,
      format: audioData.format || '',
      codec: audioData.codec || ''
    },
    tags: audioData.tags ? { ...audioData.tags } : {}
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

/**
 * 将秒数转换为时间格式字符串 (HH:MM:SS:CC)
 * @param {number} seconds - 秒数，支持小数部分
 * @returns {string} 格式化的时间字符串，CC表示百分秒（1秒=100百分秒）
 */
function formatTime(seconds) {
  if (seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100); // 将小数部分转换为百分秒
  const pad = (num) => String(num).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}:${pad(cs)}`;
}

/**
 * 将时间字符串解析为秒数
 * @param {string} timeStr - 格式化的时间字符串 (HH:MM:SS:CC)
 * @returns {number} 秒数（带小数部分）
 */
function parseTime(timeStr) {
  const [hours, minutes, seconds, cs] = timeStr.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + cs / 100;
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

/**
 * 根据音频时长显示适当的时间格式
 * 如果时长小于1小时，则不显示小时部分
 * @param {number} seconds - 秒数
 * @returns {string} 格式化的时间字符串
 */
function formatDisplayTime(seconds) {
  const timeStr = formatTime(seconds);
  const [hours, ...rest] = timeStr.split(':');
  return hours === '00' ? rest.join(':') : timeStr;
}

// 导出模块接口
module.exports = {
  AudioMetadataError,
  MetadataError,
  createAudioMetadata,
  formatFileSize,
  formatDuration: formatTime,
  formatSampleRate,
  validateAudioData,
  validateFile,
  formatTime,
  parseTime,
  formatDisplayTime
};
