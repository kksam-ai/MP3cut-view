class WaveformView {
  constructor(canvas) {
    // Canvas 相关
    this.canvas = canvas;
    this.context = canvas.getContext('2d');

    // 数据相关
    this.waveformData = null;    // 原始波形数据
    this.normalizedData = null;  // 归一化后的数据
    this.audioDuration = 0;      // 音频总时长（秒）

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

  // 设置波形数据和时长
  setWaveform(data, duration) {
    this.waveformData = data;
    this.audioDuration = duration;
    this.normalizedData = this.normalizeWaveform(data);

    if (this.canvas.offsetWidth > 0) {
      this.resize();
      this.render();
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

    // 计算最后一行的时长
    const lastRowSeconds = this.audioDuration % secondsPerRow || secondsPerRow;

    // 计算每行需要的采样点数（基于像素宽度）
    const pixelsPerRow = containerWidth * this.dpr;
    const samplesPerRow = Math.floor(pixelsPerRow / (this.BAR_WIDTH * this.dpr + this.BAR_GAP * this.dpr));

    // 计算实际布局尺寸（物理像素）
    const rowWidth = containerWidth * this.dpr;
    const lastRowWidth = (lastRowSeconds * this.PIXELS_PER_SECOND) * this.dpr;
    const rowHeight = (this.LINE_HEIGHT + this.LINE_GAP) * this.dpr;
    const totalHeight = (totalRows * (this.LINE_HEIGHT + this.LINE_GAP) - this.LINE_GAP) * this.dpr;

    return {
      dpr: this.dpr,
      containerWidth,
      containerHeight,
      rowWidth,
      lastRowWidth,
      rowHeight,
      totalHeight,
      totalRows,
      secondsPerRow,
      samplesPerRow,
      lastRowSeconds,
      pixelsPerRow
    };
  }

  // 调整Canvas大小
  resize() {
    // 如果canvas不可见或没有波形数据，直接返回
    if (this.canvas.offsetWidth === 0) return;

    // 设置CSS尺寸
    const containerWidth = this.canvas.offsetWidth;
    const containerHeight = this.canvas.offsetHeight;

    // 如果有波形数据，计算实际需要的高度
    if (this.waveformData) {
      const layout = this.calculateLayout();

      // 设置canvas的CSS尺寸
      this.canvas.style.width = `${containerWidth}px`;

      // 如果总高度超过容器高度，使用总高度
      const cssHeight = Math.max(containerHeight, layout.totalHeight / this.dpr);
      this.canvas.style.height = `${cssHeight}px`;

      // 设置canvas的物理像素尺寸
      this.canvas.width = containerWidth * this.dpr;
      this.canvas.height = cssHeight * this.dpr;

      // 重新渲染
      this.render();
    } else {
      // 没有波形数据时，仅设置为容器大小
      this.canvas.style.width = `${containerWidth}px`;
      this.canvas.style.height = `${containerHeight}px`;
      this.canvas.width = containerWidth * this.dpr;
      this.canvas.height = containerHeight * this.dpr;
    }
  }

  // 渲染波形（后续实现）
  render() {
    if (!this.waveformData || this.canvas.width === 0) return;

    const ctx = this.context;
    const layout = this.calculateLayout();

    // 清空画布
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 遍历每一行绘制波形
    for (let row = 0; row < layout.totalRows; row++) {
      const isLastRow = row === layout.totalRows - 1;
      const startY = row * layout.rowHeight;

      // 计算当前行的时间范围
      const startTime = row * layout.secondsPerRow;
      const endTime = Math.min(startTime + layout.secondsPerRow, this.audioDuration);
      const rowDuration = endTime - startTime;

      // 计算当前行的像素宽度
      const rowWidthInPixels = (rowDuration * this.PIXELS_PER_SECOND) * this.dpr;

      // 计算当前行对应的波形数据范围
      const samplesPerSecond = this.waveformData.length / this.audioDuration;
      const startSample = Math.floor(startTime * samplesPerSecond);
      const endSample = Math.ceil(endTime * samplesPerSecond);
      const rowSamples = this.waveformData.slice(startSample, endSample);

      // 计算当前行需要的采样点数（基于像素）
      const barsInRow = Math.floor(rowWidthInPixels / (this.BAR_WIDTH * this.dpr + this.BAR_GAP * this.dpr));

      // 重采样当前行的波形数据
      const resampledData = this.resampleWaveform(rowSamples, barsInRow);
      const normalizedData = this.normalizeWaveform(resampledData);

      // 绘制该行的浅蓝色背景
      ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
      ctx.fillRect(
        0,
        startY,
        rowWidthInPixels,
        this.LINE_HEIGHT * this.dpr
      );

      // 绘制该行的波形
      const barWidth = this.BAR_WIDTH * this.dpr;
      const barGap = this.BAR_GAP * this.dpr;
      const maxHeight = this.MAX_WAVE_HEIGHT * this.dpr;

      ctx.fillStyle = '#2196f3';
      for (let i = 0; i < normalizedData.length; i++) {
        const x = i * (barWidth + barGap);
        const amplitude = normalizedData[i] * maxHeight;

        // 从底部向上绘制波形条
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
