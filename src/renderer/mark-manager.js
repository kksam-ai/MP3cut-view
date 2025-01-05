/**
 * 音频标记管理类
 * 时间单位说明：
 * - 所有的时间值使用秒作为单位，支持小数部分
 * - 例如：1.5 表示一秒半
 * - 界面显示时会转换为 HH:MM:SS:CC 格式（CC表示百分秒）
 */
class MarkManager {
  // 时间调整的最小单位（一个百分秒）
  static STEP = 0.01;

  // 寻找可用位置时的最大偏移范围（秒）
  static MAX_OFFSET = 1;

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
   * 将时间规范化到最小精度单位
   * @private
   * @param {number} time - 输入时间
   * @returns {number} 规范化后的时间
   */
  normalizeTime(time) {
    return Math.round(time / MarkManager.STEP) * MarkManager.STEP;
  }

  /**
   * 添加标记
   * @param {string} type - 标记类型 ('start' | 'end')
   * @param {number} time - 标记时间点（秒）
   * @returns {Object|null} 创建的标记对象，如果无法创建则返回null
   */
  addMark(type, time) {
    if (time < 0) return null;

    // 规范化时间
    const normalizedTime = this.normalizeTime(time);

    // 检查是否与现有标记冲突
    if (this.hasTimeConflict(normalizedTime, type, null)) {
      return null;
    }

    // 创建新标记
    const id = this.generateId();
    const mark = { id, type, time: normalizedTime };
    this.marks.set(id, mark);
    return mark;
  }

  /**
   * 删除标记
   * @param {string} id - 标记ID
   * @returns {boolean} 删除是否成功
   */
  removeMark(id) {
    return this.marks.delete(id);
  }

  /**
   * 更新标记时间
   * @param {string} id - 标记ID
   * @param {number} newTime - 新的时间点（秒）
   * @returns {boolean} 更新是否成功
   */
  updateMarkTime(id, newTime) {
    const mark = this.marks.get(id);
    if (!mark || newTime < 0) return false;

    // 规范化时间
    const normalizedTime = this.normalizeTime(newTime);

    // 如果新时间没有冲突，直接更新
    if (!this.hasTimeConflict(normalizedTime, mark.type, id)) {
      mark.time = normalizedTime;
      return true;
    }

    // 尝试找到可用位置
    const adjustedTime = this.findAvailableTime(normalizedTime, mark.type, id);
    if (adjustedTime !== null) {
      mark.time = adjustedTime;
      return true;
    }

    // 如果找不到合适的位置，保持原位置不变
    return false;
  }

  /**
   * 检查指定时间是否与同类标记冲突
   * @private
   * @param {number} time - 要检查的时间点
   * @param {string} type - 标记类型
   * @param {string|null} excludeId - 要排除的标记ID
   * @returns {boolean} 是否存在冲突
   */
  hasTimeConflict(time, type, excludeId) {
    return Array.from(this.marks.values()).some(mark => {
      // 排除自身
      if (mark.id === excludeId) return false;

      // 只检查同类型标记
      if (mark.type !== type) return false;

      // 检查时间差是否小于最小精度
      const timeDiff = Math.abs(mark.time - time);
      return timeDiff < MarkManager.STEP;
    });
  }

  /**
   * 在指定范围内查找可用的时间位置
   * @private
   * @param {number} time - 期望的时间点
   * @param {string} type - 标记类型
   * @param {string|null} excludeId - 要排除的标记ID
   * @returns {number|null} 找到的可用时间点，如果找不到则返回null
   */
  findAvailableTime(time, type, excludeId) {
    // 规范化初始时间
    time = this.normalizeTime(time);

    // 向后查找
    let forwardTime = time;
    const maxForwardTime = time + MarkManager.MAX_OFFSET;

    while (forwardTime <= maxForwardTime) {
      if (!this.hasTimeConflict(forwardTime, type, excludeId)) {
        return forwardTime;
      }
      forwardTime += MarkManager.STEP;
    }

    // 向前查找
    let backwardTime = time;
    const minBackwardTime = Math.max(0, time - MarkManager.MAX_OFFSET);

    while (backwardTime >= minBackwardTime) {
      if (!this.hasTimeConflict(backwardTime, type, excludeId)) {
        return backwardTime;
      }
      backwardTime -= MarkManager.STEP;
    }

    return null;
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
