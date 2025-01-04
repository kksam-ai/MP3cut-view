/**
 * 音频标记管理类
 * 时间单位说明：
 * - 所有的时间值使用秒作为单位，支持小数部分
 * - 例如：1.5 表示一秒半
 * - 界面显示时会转换为 HH:MM:SS:CC 格式（CC表示百分秒）
 */
class MarkManager {
  constructor() {
    // 存储所有标记
    this.marks = new Map();
    // 用于生成唯一ID
    this.idCounter = 0;
  }

  // 生成唯一ID
  generateId() {
    return `mark_${++this.idCounter}`;
  }

  /**
   * 添加标记
   * @param {string} type - 标记类型 ('start' | 'end')
   * @param {number} time - 标记时间点（秒），例如：1.5表示一秒半
   * @returns {Object} 创建的标记对象
   */
  addMark(type, time) {
    const id = this.generateId();
    const mark = {
      id,
      type,
      time
    };

    this.marks.set(id, mark);
    return mark;
  }

  /**
   * 更新标记时间
   * @param {string} id - 标记ID
   * @param {number} newTime - 新的时间点（秒）
   * @returns {boolean} 更新是否成功
   */
  updateMarkTime(id, newTime) {
    const mark = this.marks.get(id);
    if (!mark) return false;

    if (newTime < 0) return false;

    mark.time = newTime;
    return true;
  }

  // 获取所有标记
  getAllMarks() {
    return Array.from(this.marks.values());
  }

  /**
   * 获取有效的导出区间
   * @param {number} minDuration - 最小区间长度（秒），默认为1秒
   * @returns {Array<Object>} 有效的导出区间列表，每个区间包含开始和结束时间（秒）
   */
  getValidSegments(minDuration = 1) {
    // 按时间排序所有标记
    const sortedMarks = Array.from(this.marks.values())
      .sort((a, b) => a.time - b.time);

    const segments = [];
    let startMark = null;

    // 查找相邻的起始和结束标记
    for (const mark of sortedMarks) {
      if (mark.type === 'start') {
        startMark = mark;
      } else if (mark.type === 'end' && startMark) {
        // 验证区间有效性
        if (mark.time > startMark.time &&
            mark.time - startMark.time >= minDuration) {
          segments.push({
            startId: startMark.id,
            endId: mark.id,
            startTime: startMark.time,
            endTime: mark.time
          });
        }
        startMark = null;
      }
    }

    return segments;
  }

  // 清除所有标记
  clear() {
    this.marks.clear();
    this.idCounter = 0;
  }
}

module.exports = MarkManager;
