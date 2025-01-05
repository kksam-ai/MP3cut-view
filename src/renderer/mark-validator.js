/**
 * 音频片段验证模块
 * 用于验证和提取有效的音频片段
 */

/**
 * 表示一个有效的音频片段
 * @typedef {Object} ValidSegment
 * @property {number} startTime - 开始时间(秒)
 * @property {number} endTime - 结束时间(秒)
 * @property {number} duration - 时长(秒)
 * @property {number} index - 序号(从1开始)
 */

/**
 * 获取有效的音频片段列表
 * @param {Array} marks - 标记列表
 * @param {number} audioDuration - 音频总时长(秒)
 * @returns {ValidSegment[]} 有效片段列表
 */
function getValidSegments(marks, audioDuration) {
  console.log('开始验证片段:', { marks, audioDuration });

  // 参数验证
  if (!Array.isArray(marks) || marks.length === 0) {
    console.log('标记列表为空或无效');
    return [];
  }

  if (typeof audioDuration !== 'number' || audioDuration <= 0) {
    console.log('音频时长无效:', audioDuration);
    return [];
  }

  // 按时间排序
  const sortedMarks = marks.sort((a, b) => a.time - b.time);
  console.log('排序后的标记:', sortedMarks);

  // 查找有效片段
  const segments = [];
  let index = 1;

  for (let i = 0; i < sortedMarks.length - 1; i++) {
    const current = sortedMarks[i];
    const next = sortedMarks[i + 1];

    // 验证时间范围
    if (current.time < 0 || next.time > audioDuration) {
      console.log('标记超出范围:', { current, next, audioDuration });
      continue;
    }

    // 检查是否为有效的开始-结束标记对
    if (current.type === 'start' && next.type === 'end') {
      const duration = next.time - current.time;

      // 验证时间间隔
      if (duration >= 1) {
        console.log('找到有效片段:', { start: current, end: next, duration });
        segments.push({
          startTime: current.time,
          endTime: next.time,
          duration: duration,
          index: index++
        });

        // 跳过已使用的结束标记
        i++;
      } else {
        console.log('片段时长不足1秒:', duration);
      }
    } else {
      console.log('非有效的开始-结束对:', { current, next });
    }
  }

  console.log('验证完成,有效片段数:', segments.length);
  return segments;
}

/**
 * 格式化时间显示
 * @param {number} seconds - 秒数
 * @returns {string} 格式化的时间字符串 (HH:MM:SS:CC)
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centisecs = Math.floor((seconds % 1) * 100);

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}:${pad(centisecs)}`;
}

/**
 * 数字补零
 * @param {number} num - 数字
 * @returns {string} 补零后的字符串
 */
function pad(num) {
  return num.toString().padStart(2, '0');
}

// 导出模块
module.exports = {
  getValidSegments,
  formatTime
};
