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

  // 添加峰值检测函数
  detectPeaks(data, windowSize) {
    const peaks = [];

    for (let i = 0; i < data.length; i += windowSize) {
      const window = data.slice(i, Math.min(i + windowSize, data.length));
      if (window.length === 0) break;

      // 找出窗口内的最大值和最小值
      const max = Math.max(...window);
      const min = Math.min(...window);

      // 使用较大的绝对值来表示波形高度
      const peak = Math.abs(max) > Math.abs(min) ? max : min;
      peaks.push(peak);
    }

    return new Float32Array(peaks);
  }

  // 修改重采样函数
  resampleWaveform(waveform, targetLength) {
    const originalLength = waveform.length;

    // 如果目标长度大于原始长度,直接返回原始数据
    if (targetLength >= originalLength) {
      return new Float32Array(waveform);
    }

    // 计算每个窗口的大小
    const windowSize = Math.ceil(originalLength / targetLength);

    // 使用峰值检测进行重采样
    return this.detectPeaks(waveform, windowSize);
  }

  // 修改波形处理函数
  processWaveform(data) {
    if (!data || data.length === 0) {
      console.error('Invalid input data');
      return new Float32Array(0);
    }

    try {
      // 计算需要的总波形条数
      // 1秒 = 1000ms / 66.67ms ≈ 15个波形条
      const barsPerSecond = 1000 / 66.67;
      const totalBars = Math.ceil(this.audioDuration * barsPerSecond);

      // 计算每个波形条对应的原始数据点数
      const samplesPerBar = Math.ceil(data.length / totalBars);

      // 使用峰值检测处理原始数据
      const processedData = this.detectPeaks(data, samplesPerBar);

      // 归一化处理后的数据
      const maxAmplitude = Math.max(...Array.from(processedData).map(Math.abs));
      if (maxAmplitude === 0) {
        console.warn('No amplitude detected in audio data');
        return new Float32Array(processedData.length).fill(0);
      }

      const normalizedData = new Float32Array(processedData.length);
      for (let i = 0; i < processedData.length; i++) {
        normalizedData[i] = processedData[i] / maxAmplitude;
      }

      console.log('Waveform processing stats:', {
        audioDuration: this.audioDuration,
        barsPerSecond,
        totalBars,
        samplesPerBar,
        processedLength: normalizedData.length
      });

      return normalizedData;
    } catch (error) {
      console.error('Error processing waveform:', error);
      return new Float32Array(0);
    }
  }

  // 设置波形数据和时长
  setWaveform(data, duration) {
    if (!data || !duration) {
      console.error('Invalid data or duration');
      return;
    }

    // 重置所有状态
    this.waveformData = new Float32Array(data);
    this.audioDuration = duration;

    if (this.canvas.offsetWidth > 0) {
      try {
        // 重新处理波形数据
        this.processedData = this.processWaveform(this.waveformData);
        console.log('Processed waveform data:', {
          originalLength: data.length,
          processedLength: this.processedData.length,
          duration: this.audioDuration
        });

        // 强制重新计算布局和尺寸
        this.canvas.style.width = '';
        this.canvas.style.height = '';
        this.canvas.width = 0;
        this.canvas.height = 0;

        // 重新设置尺寸和渲染
        this.resize();
      } catch (error) {
        console.error('Error in setWaveform:', error);
      }
    }
  }

  // 计算布局信息
  calculateLayout() {
    // 获取容器CSS尺寸
    const containerWidth = this.canvas.offsetWidth;
    const containerHeight = this.canvas.offsetHeight;

    // 计算每个波形条的总宽度(包含间距)
    const barTotalWidth = this.BAR_WIDTH + this.BAR_GAP;

    // 计算每行能容纳的波形条数量
    const barsPerRow = Math.floor(containerWidth / barTotalWidth);

    // 计算总行数
    const totalBars = this.processedData.length;
    const totalRows = Math.ceil(totalBars / barsPerRow);

    // 计算最后一行的波形条数量
    const lastRowBars = totalBars % barsPerRow || barsPerRow;

    // 计算实际需要的高度（CSS像素）
    const rowHeightCSS = this.LINE_HEIGHT + this.LINE_GAP;
    const totalHeightCSS = totalRows * rowHeightCSS - this.LINE_GAP;

    // 计算物理像素尺寸
    const rowHeight = rowHeightCSS * this.dpr;
    const totalHeight = totalHeightCSS * this.dpr;
    const rowWidth = containerWidth * this.dpr;

    // 计算最后一行宽度
    const lastRowWidth = (lastRowBars * barTotalWidth) * this.dpr;

    // 如果需要重采样,使用新的峰值检测方法
    if (totalBars > this.waveformData.length) {
      this.waveformData = this.resampleWaveform(this.waveformData, totalBars);
    }

    return {
      dpr: this.dpr,
      // 容器信息
      containerWidth,
      containerHeight,
      // 波形条信息
      barTotalWidth: barTotalWidth * this.dpr,
      barsPerRow,
      // 行信息
      rowWidth,
      rowHeight,
      // 总体信息
      totalRows,
      totalBars,
      totalHeight,
      totalHeightCSS,
      // 最后一行信息
      lastRowWidth,
      lastRowBars
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

      // 计算当前行的波形条数量和数据范围
      const barsInThisRow = isLastRow ? layout.lastRowBars : layout.barsPerRow;
      const startIndex = row * layout.barsPerRow;
      const rowData = this.processedData.slice(startIndex, startIndex + barsInThisRow);

      // 计算当前行的宽度
      const rowWidthInPixels = isLastRow ? layout.lastRowWidth : layout.rowWidth;

      // 绘制背景
      ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
      ctx.fillRect(
        0,
        startY,
        rowWidthInPixels,
        this.LINE_HEIGHT * this.dpr
      );

      // 绘制波形
      ctx.fillStyle = '#2196f3';
      for (let i = 0; i < rowData.length; i++) {
        const x = i * layout.barTotalWidth;
        const amplitude = rowData[i] * (this.MAX_WAVE_HEIGHT * this.dpr);

        ctx.fillRect(
          x,
          startY + (this.LINE_HEIGHT * this.dpr) - amplitude,
          this.BAR_WIDTH * this.dpr,
          amplitude
        );
      }
    }
  }
}

module.exports = WaveformView;
