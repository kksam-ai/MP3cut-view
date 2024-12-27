class WaveformView {
  constructor(canvas) {
    // Canvas 相关
    this.canvas = canvas;
    this.context = canvas.getContext('2d');

    // 数据相关
    this.waveformData = null;     // 原始波形数据
    this.processedData = null;    // 基于默认缩放比例处理后的数据
    this.audioDuration = 0;       // 音频总时长（秒）

    // 基准配置（都是CSS像素单位）
    this.PIXELS_PER_SECOND = 45;  // 每秒音频占用的像素宽度
    this.LINE_HEIGHT = 90;        // 每行波形的高度
    this.LINE_GAP = 15;          // 行间距
    this.MAX_WAVE_HEIGHT = 70;    // 波形最大高度
    this.BAR_WIDTH = 2;          // 波形条宽度
    this.BAR_GAP = 1;            // 波形条间距

    // 缓存设备像素比
    this.dpr = window.devicePixelRatio;

    // 初始化
    this.resize();

    // 事件监听
    window.addEventListener('resize', () => {
      this.dpr = window.devicePixelRatio;
      this.resize();
    });
  }

  // 重采样波形数据，确保数据点均匀分布
  resampleWaveform(data, targetLength) {
    const result = new Float32Array(targetLength);
    const step = data.length / targetLength;

    for (let i = 0; i < targetLength; i++) {
      const position = i * step;
      const index = Math.floor(position);
      const decimal = position - index;

      // 使用线性插值获取采样点
      const currentValue = data[index] || 0;
      const nextValue = data[index + 1] || currentValue;
      result[i] = currentValue + (nextValue - currentValue) * decimal;
    }

    return result;
  }

  // 归一化波形数据到0-1范围
  normalizeWaveform(data) {
    const max = Math.max(...data);
    return data.map(value => value / max);
  }

  // 处理波形数据，基于默认缩放比例
  processWaveform(data) {
    // 获取当前容器宽度
    const containerWidth = this.canvas.offsetWidth;
    // 计算每行可以容纳的采样点数
    const barsPerRow = Math.floor(containerWidth / (this.BAR_WIDTH + this.BAR_GAP));
    // 计算总采样点数
    const totalBars = Math.ceil(this.audioDuration * this.PIXELS_PER_SECOND / (this.BAR_WIDTH + this.BAR_GAP));

    // 重采样
    const resampled = this.resampleWaveform(data, totalBars);
    // 归一化
    return this.normalizeWaveform(resampled);
  }

  // 设置波形数据和时长
  setWaveform(data, duration) {
    // 重置所有状态
    this.waveformData = data;
    this.audioDuration = duration;

    if (this.canvas.offsetWidth > 0) {
      // 重新处理波形数据
      this.processedData = this.processWaveform(data);
      // 强制重新计算布局和尺寸
      this.canvas.style.width = '';
      this.canvas.style.height = '';
      this.canvas.width = 0;
      this.canvas.height = 0;
      // 重新设置尺寸和渲染
      this.resize();
    }
  }

  // 计算布局信息
  calculateLayout() {
    // 获取容器CSS尺寸
    const containerWidth = this.canvas.offsetWidth;
    const containerHeight = this.canvas.offsetHeight;

    // 计算每行可以显示的时长（秒）
    const secondsPerRow = containerWidth / this.PIXELS_PER_SECOND;

    // 计算需要的总行数
    const totalRows = Math.ceil(this.audioDuration / secondsPerRow);

    // 计算每行波形数据的索引范围
    const samplesPerSecond = this.processedData.length / this.audioDuration;
    const samplesPerRow = Math.floor(secondsPerRow * samplesPerSecond);

    // 计算实际需要的高度（CSS像素）
    const rowHeightCSS = this.LINE_HEIGHT + this.LINE_GAP;
    const totalHeightCSS = totalRows * rowHeightCSS - this.LINE_GAP;

    // 计算物理像素尺寸
    const rowHeight = rowHeightCSS * this.dpr;
    const totalHeight = totalHeightCSS * this.dpr;
    const rowWidth = containerWidth * this.dpr;

    // 计算最后一行
    const lastRowSeconds = this.audioDuration % secondsPerRow || secondsPerRow;
    const lastRowWidth = (lastRowSeconds * this.PIXELS_PER_SECOND) * this.dpr;
    const lastRowSamples = Math.floor(lastRowSeconds * samplesPerSecond);

    return {
      dpr: this.dpr,
      // 容器信息
      containerWidth,
      containerHeight,
      // 行信息
      rowWidth,
      rowHeight,
      secondsPerRow,
      samplesPerRow,
      // 总体信息
      totalRows,
      totalHeight: totalHeight,
      totalHeightCSS,
      // 最后一行信息
      lastRowWidth,
      lastRowSeconds,
      lastRowSamples,
      // 采样率信息
      samplesPerSecond
    };
  }

  // 调整Canvas大小
  resize() {
    // 如果canvas不可见，直接返回
    if (this.canvas.offsetWidth === 0) return;

    // 设置CSS尺寸
    const containerWidth = this.canvas.offsetWidth;
    const containerHeight = this.canvas.offsetHeight;

    // 设置canvas的CSS宽度
    this.canvas.style.width = `${containerWidth}px`;

    if (this.processedData) {
      // 获取布局信息
      const layout = this.calculateLayout();

      // 设置canvas的CSS高度为实际波形高度
      this.canvas.style.height = `${layout.totalHeightCSS}px`;

      // 设置canvas的物理像素尺寸
      this.canvas.width = containerWidth * this.dpr;
      this.canvas.height = layout.totalHeight;
    } else {
      // 没有波形数据时，设置为最小高度
      const minHeight = this.LINE_HEIGHT;
      this.canvas.style.height = `${minHeight}px`;
      this.canvas.width = containerWidth * this.dpr;
      this.canvas.height = minHeight * this.dpr;
    }

    // 如果有波形数据，重新渲染
    if (this.processedData) {
      this.render();
    }
  }

  // 渲染波形（后续实现）
  render() {
    if (!this.processedData || this.canvas.width === 0) return;

    const ctx = this.context;
    const layout = this.calculateLayout();

    // 清空画布
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 遍历每一行绘制波形
    for (let row = 0; row < layout.totalRows; row++) {
      const isLastRow = row === layout.totalRows - 1;
      const startY = row * layout.rowHeight;

      // 计算当前行的数据范围和宽度
      const startIndex = row * layout.samplesPerRow;
      const samplesInThisRow = isLastRow ? layout.lastRowSamples : layout.samplesPerRow;
      const rowData = this.processedData.slice(startIndex, startIndex + samplesInThisRow);
      const rowWidthInPixels = isLastRow ? layout.lastRowWidth : layout.rowWidth;

      // 绘制背景
      ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
      ctx.fillRect(
        0,
        startY,
        rowWidthInPixels,
        this.LINE_HEIGHT * this.dpr
      );

      // 计算实际的波形条间距，确保填满背景宽度
      const totalBars = rowData.length;
      const availableWidth = rowWidthInPixels;
      const barWidth = this.BAR_WIDTH * this.dpr;
      const barGap = (availableWidth - totalBars * barWidth) / (totalBars - 1);

      // 绘制波形
      ctx.fillStyle = '#2196f3';
      for (let i = 0; i < rowData.length; i++) {
        const x = i * (barWidth + barGap);
        const amplitude = rowData[i] * (this.MAX_WAVE_HEIGHT * this.dpr);

        ctx.fillRect(
          x,
          startY + (this.LINE_HEIGHT * this.dpr) - amplitude,
          barWidth,
          amplitude
        );
      }
    }
  }
}

module.exports = WaveformView;
