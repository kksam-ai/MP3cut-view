class MarkManager {
  constructor() {
    // 存储所有标记
    this.marks = new Map();
    // 存储标记的配对关系
    this.pairs = new Map();
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
      time,
      pairedId: null
    };

    this.marks.set(id, mark);
    return mark;
  }

  // 删除标记
  removeMark(id) {
    const mark = this.marks.get(id);
    if (!mark) return false;

    // 如果有配对的标记,解除配对关系
    if (mark.pairedId) {
      const pairedMark = this.marks.get(mark.pairedId);
      if (pairedMark) {
        pairedMark.pairedId = null;
      }
      this.pairs.delete(mark.id);
      this.pairs.delete(mark.pairedId);
    }

    this.marks.delete(id);
    return true;
  }

  // 更新标记时间
  updateMarkTime(id, newTime) {
    const mark = this.marks.get(id);
    if (!mark) return false;

    // 检查新时间是否有效
    if (newTime < 0) return false;

    // 如果有配对标记,检查时间是否合法
    if (mark.pairedId) {
      const pairedMark = this.marks.get(mark.pairedId);
      if (pairedMark) {
        // 确保开始标记在结束标记之前
        if (mark.type === 'start' && newTime >= pairedMark.time) return false;
        if (mark.type === 'end' && newTime <= pairedMark.time) return false;
      }
    }

    mark.time = newTime;
    return true;
  }

  // 尝试配对标记
  tryPairMarks(startId, endId) {
    const startMark = this.marks.get(startId);
    const endMark = this.marks.get(endId);

    // 验证标记存在且类型正确
    if (!startMark || !endMark) return false;
    if (startMark.type !== 'start' || endMark.type !== 'end') return false;

    // 验证时间顺序
    if (startMark.time >= endMark.time) return false;

    // 如果已经有配对,先解除原有配对
    if (startMark.pairedId) {
      const oldPairedMark = this.marks.get(startMark.pairedId);
      if (oldPairedMark) oldPairedMark.pairedId = null;
    }
    if (endMark.pairedId) {
      const oldPairedMark = this.marks.get(endMark.pairedId);
      if (oldPairedMark) oldPairedMark.pairedId = null;
    }

    // 建立新的配对关系
    startMark.pairedId = endId;
    endMark.pairedId = startId;
    this.pairs.set(startId, endId);
    this.pairs.set(endId, startId);

    return true;
  }

  // 获取所有标记
  getAllMarks() {
    return Array.from(this.marks.values());
  }

  // 获取未配对的标记
  getUnpairedMarks() {
    return this.getAllMarks().filter(mark => !mark.pairedId);
  }

  // 获取已配对的标记
  getPairedMarks() {
    return this.getAllMarks().filter(mark => mark.pairedId);
  }

  // 获取配对的标记段
  getPairedSegments() {
    const segments = [];
    const processed = new Set();

    for (const mark of this.marks.values()) {
      if (mark.type === 'start' && mark.pairedId && !processed.has(mark.id)) {
        const endMark = this.marks.get(mark.pairedId);
        if (endMark) {
          segments.push({
            startId: mark.id,
            endId: mark.pairedId,
            startTime: mark.time,
            endTime: endMark.time
          });
          processed.add(mark.id);
          processed.add(mark.pairedId);
        }
      }
    }

    return segments;
  }

  // 清除所有标记
  clear() {
    this.marks.clear();
    this.pairs.clear();
    this.idCounter = 0;
  }
}

module.exports = MarkManager;
