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

  // 添加标记
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

  // 删除标记
  removeMark(id) {
    return this.marks.delete(id);
  }

  // 更新标记时间
  updateMarkTime(id, newTime) {
    const mark = this.marks.get(id);
    if (!mark) return false;

    // 检查新时间是否有效
    if (newTime < 0) return false;

    mark.time = newTime;
    return true;
  }

  // 获取所有标记
  getAllMarks() {
    return Array.from(this.marks.values());
  }

  // 获取有效的导出区间
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
