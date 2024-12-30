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

    // 添加容器引用
    this.container = canvas.parentElement;

    // 绑定滚动条检查方法
    this.checkScrollbar = this.checkScrollbar.bind(this);

    // 初始化
    this.resize();

    // 事件监听
    window.addEventListener('resize', () => {
      this.dpr = window.devicePixelRatio;
      this.resize();
    });

    // 播放条相关
    this.playbackPosition = 0;  // 当前播放位置(秒)
    this._animationFrame = null;

    // 点击回调
    this.onTimeSelect = null;

    // 绑定事件处理
    this._handleClick = this._handleClick.bind(this);
    this.canvas.addEventListener('click', this._handleClick);

    // 添加标记相关的属性
    this.marks = [];
    this.selectedMarkId = null;
    this.isDraggingMark = false;
    this.markWidth = 10; // 标记图标的宽度
    this.markHeight = 20; // 标记图标的高度

    // 绑定标记相关的事件处理
    this.canvas.addEventListener('mousedown', this.handleMarkMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMarkMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMarkMouseUp.bind(this));
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
      // 使用目标波形条密度计算总条数
      // 保持每秒15条的密度（与原来相同）
      const BARS_PER_SECOND = 15;
      const totalBars = Math.ceil(this.audioDuration * BARS_PER_SECOND);

      // 计算每个波形条对应的原始数据点数
      const samplesPerBar = Math.ceil(data.length / totalBars);

      // 记录采样参数
      console.log('Waveform sampling parameters:', {
        audioDuration: this.audioDuration,
        barsPerSecond: BARS_PER_SECOND,
        totalBars,
        dataLength: data.length,
        samplesPerBar
      });

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

      // 验证结果
      console.log('Waveform processing results:', {
        expectedBars: totalBars,
        actualBars: normalizedData.length,
        firstFewSamples: Array.from(normalizedData.slice(0, 5)),
        lastFewSamples: Array.from(normalizedData.slice(-5))
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
    this.playbackPosition = 0;  // 重置播放条位置
    this.stopPlayback();  // 停止之前的播放动画
    this.marks = [];      // 清除标记数据
    this.selectedMarkId = null;  // 清除选中状态

    try {
      // 处理波形数据
      this.processedData = this.processWaveform(this.waveformData);

      // 调整大小并重新渲染
      this.resize();

      // 记录处理结果
      console.log('Processed waveform data:', {
        originalLength: this.waveformData.length,
        processedLength: this.processedData.length,
        duration: this.audioDuration
      });
    } catch (error) {
      console.error('Error in setWaveform:', error);
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

  // 检查是否需要滚动条
  checkScrollbar() {
    if (!this.container) return;

    // 强制重新计算布局
    this.container.style.overflowY = 'hidden';
    void this.container.offsetHeight; // 触发重排

    const needsScroll = this.canvas.offsetHeight > this.container.clientHeight;

    // 设置新的overflow状态
    this.container.style.overflowY = needsScroll ? 'overlay' : 'hidden';

    // 再次检查以确保状态正确
    requestAnimationFrame(() => {
      const needsScrollRecheck = this.canvas.offsetHeight > this.container.clientHeight;
      if (needsScrollRecheck !== needsScroll) {
        this.container.style.overflowY = needsScrollRecheck ? 'overlay' : 'hidden';
      }
    });
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

    // 在设置完 canvas 尺寸后检查滚动条
    // 使用多次检查确保状态正确
    this.checkScrollbar();
    requestAnimationFrame(() => {
      this.checkScrollbar();
      // 再次检查以处理边缘情况
      setTimeout(() => {
        this.checkScrollbar();
      }, 100);
    });
  }

  // 渲染波形（后续实现）
  render() {
    if (!this.processedData || this.canvas.width === 0) return;

    // 使用新的 draw 方法替代原有的渲染逻辑
    this.draw();
  }

  // 修改 drawWaveform 方法（从原 render 方法中提取波形渲染逻辑）
  drawWaveform() {
    if (!this.processedData) return;

    const ctx = this.context;
    const layout = this.calculateLayout();

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

  // 添加 drawPlayhead 方法（从原 render 方法中提取播放条渲染逻辑）
  drawPlayhead() {
    if (!this.processedData) return;

    const layout = this.calculateLayout();
    const playbackPos = this._calculatePlaybackPosition();

    if (playbackPos && playbackPos.isVisible) {
      const x = playbackPos.offset;
      const y = playbackPos.row * layout.rowHeight;

      this.context.fillStyle = '#ff9800';  // 橙色
      this.context.fillRect(
        x,
        y,
        2 * this.dpr,  // 2px宽度
        this.LINE_HEIGHT * this.dpr  // 90px高度
      );
    }
  }

  // 设置播放位置
  setPlaybackPosition(time) {
    this.playbackPosition = time;
    this.render();  // 重新渲染以更新播放条位置
  }

  // 开始播放动画
  startPlayback() {
    if (this._animationFrame) return;

    let lastTime = performance.now();
    const animate = () => {
      const currentTime = performance.now();
      // 限制刷新率，避免过度渲染
      if (currentTime - lastTime > 16) {  // 约60fps
        this.render();
        lastTime = currentTime;
      }
      this._animationFrame = requestAnimationFrame(animate);
    };

    animate();
  }

  // 停止播放动画
  stopPlayback() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  // 计算播放条位置
  _calculatePlaybackPosition() {
    if (!this.processedData) return null;

    const layout = this.calculateLayout();

    // 计算当前播放位置对应的波形索引
    // 使用音频总时长和波形总条数建立映射
    const progress = this.playbackPosition / this.audioDuration;
    const totalBars = this.processedData.length;
    const currentBar = Math.floor(progress * totalBars);

    // 计算行号和行内偏移
    const row = Math.floor(currentBar / layout.barsPerRow);
    const barsInThisRow = currentBar % layout.barsPerRow;
    const offset = barsInThisRow * layout.barTotalWidth;

    // 添加详细日志
    console.log('Playback position calculation:', {
      time: this.playbackPosition,
      duration: this.audioDuration,
      progress,
      totalBars,
      currentBar,
      row,
      offset
    });

    return {
      row,
      offset,
      isVisible: row < layout.totalRows
    };
  }

  // 处理点击事件
  _handleClick(e) {
    if (!this.processedData || !this.onTimeSelect) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 计算点击位置对应的波形条索引
    const layout = this.calculateLayout();
    const rowIndex = Math.floor(y / (this.LINE_HEIGHT + this.LINE_GAP));
    const clickedBar = rowIndex * layout.barsPerRow + Math.floor(x / (this.BAR_WIDTH + this.BAR_GAP));

    // 使用波形条索引比例计算时间
    const progress = clickedBar / this.processedData.length;
    const time = progress * this.audioDuration;

    // 添加调试日志
    console.log('Click position calculation:', {
      x,
      y,
      rowIndex,
      clickedBar,
      totalBars: this.processedData.length,
      progress,
      time
    });

    // 确保时间在有效范围内
    if (time >= 0 && time <= this.audioDuration) {
      this.onTimeSelect(time);
    }
  }

  // 清理资源
  destroy() {
    // 停止播放动画
    this.stopPlayback();

    // 移除事件监听
    this.canvas.removeEventListener('click', this._handleClick);

    // 清除动画帧
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  // 设置标记数据
  setMarks(marks) {
    this.marks = marks;
    this.render();
  }

  // 将时间转换为位置
  timeToPosition(time) {
    const layout = this.calculateLayout();
    const pixelsPerSecond = this.PIXELS_PER_SECOND * this.scale;
    const totalPixels = time * pixelsPerSecond;
    return {
      x: totalPixels,
      row: Math.floor(totalPixels / layout.rowWidth)
    };
  }

  // 将位置转换为时间
  positionToTime(x, row) {
    const layout = this.calculateLayout();
    const pixelsPerSecond = this.PIXELS_PER_SECOND * this.scale;
    const totalPixels = row * layout.rowWidth + x;
    return totalPixels / pixelsPerSecond;
  }

  // 检查点击是否命中标记
  hitTest(x, y) {
    if (!this.marks || !this.processedData) return null;

    // 将点击坐标转换为相对于当前行的位置
    const layout = this.calculateLayout();
    const row = Math.floor(y / (this.LINE_HEIGHT + this.LINE_GAP));

    // 遍历所有标记
    for (const mark of this.marks) {
      // 使用新的位置计算方法
      const barIndex = this.timeToBarIndex(mark.time);
      const {x: markX, y: markY} = this.barIndexToPixel(barIndex);

      // 计算标记的点击检测区域
      const flagSize = 15; // 与绘制时使用的大小一致
      let hitBox;

      if (mark.type === 'start') {
        // 向右的三角形检测区域
        hitBox = {
          left: markX,
          right: markX + flagSize,
          top: markY,
          bottom: markY + this.LINE_HEIGHT
        };
      } else {
        // 向左的三角形检测区域
        hitBox = {
          left: markX - flagSize,
          right: markX,
          top: markY,
          bottom: markY + this.LINE_HEIGHT
        };
      }

      // 检查点击是否在标记的区域内
      if (x >= hitBox.left && x <= hitBox.right &&
          y >= hitBox.top && y <= hitBox.bottom) {
        return mark;
      }
    }

    return null;
  }

  // 处理标记的鼠标按下事件
  handleMarkMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitMark = this.hitTest(x, y);
    if (hitMark) {
      this.selectedMarkId = hitMark.id;
      this.isDraggingMark = true;
      this.render();
    } else {
      this.selectedMarkId = null;
      this.render();
    }
  }

  // 处理标记的鼠标移动事件
  handleMarkMouseMove(e) {
    if (!this.isDraggingMark || !this.selectedMarkId) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 计算新的时间位置
    const layout = this.calculateLayout();
    const rowIndex = Math.floor(y / (this.LINE_HEIGHT + this.LINE_GAP));
    const clickedBar = rowIndex * layout.barsPerRow + Math.floor(x / (this.BAR_WIDTH + this.BAR_GAP));

    // 使用波形条索引比例计算时间
    const progress = clickedBar / this.processedData.length;
    const time = progress * this.audioDuration;

    // 触发标记移动事件
    if (this.onMarkMove) {
      this.onMarkMove(this.selectedMarkId, time);
    }
  }

  // 处理标记的鼠标松开事件
  handleMarkMouseUp() {
    this.isDraggingMark = false;
  }

  // 添加时间转换为波形条索引的方法
  timeToBarIndex(time) {
    const progress = time / this.audioDuration;
    return Math.floor(progress * this.processedData.length);
  }

  // 添加波形条索引转换为像素坐标的方法
  barIndexToPixel(barIndex) {
    const layout = this.calculateLayout();
    const row = Math.floor(barIndex / layout.barsPerRow);
    const col = barIndex % layout.barsPerRow;
    return {
      x: col * (this.BAR_WIDTH + this.BAR_GAP),
      y: row * (this.LINE_HEIGHT + this.LINE_GAP)
    };
  }

  // 修改绘制方法，确保正确的渲染顺序
  draw() {
    // 1. 清除画布
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. 绘制波形（最底层）
    this.drawWaveform();

    // 3. 绘制标记（中间层）
    this.drawMarks();

    // 4. 绘制播放条（最上层）
    this.drawPlayhead();
  }

  // 实现标记绘制方法
  drawMarks() {
    if (!this.marks || !this.processedData) return;

    const ctx = this.context;
    const layout = this.calculateLayout();

    this.marks.forEach(mark => {
      // 计算标记位置
      const barIndex = this.timeToBarIndex(mark.time);
      const {x, y} = this.barIndexToPixel(barIndex);

      // 转换为物理像素坐标
      const physicalX = Math.floor(x * this.dpr);
      const physicalY = Math.floor(y * this.dpr);
      const lineHeight = Math.floor(this.LINE_HEIGHT * this.dpr);

      // 设置颜色（根据类型和选中状态）
      const isStart = mark.type === 'start';
      const isSelected = mark.id === this.selectedMarkId;

      // 使用浅色作为默认颜色，深色作为选中颜色
      if (isStart) {
        ctx.fillStyle = isSelected ? '#2E7D32' : '#81C784'; // 深绿/浅绿
      } else {
        ctx.fillStyle = isSelected ? '#C62828' : '#E57373'; // 深红/浅红
      }

      // 如果未配对，使用半透明效果
      if (!mark.pairedId) {
        ctx.globalAlpha = 0.5;
      }

      // 绘制整个标记（旗杆和旗帜作为一个路径）
      ctx.beginPath();
      const flagSize = Math.floor(15 * this.dpr); // 15px的三角形
      const poleWidth = Math.floor(2 * this.dpr); // 2px的旗杆宽度

      if (isStart) {
        // 向右的标记
        // 从旗杆左上角开始
        ctx.moveTo(physicalX - poleWidth/2, physicalY);
        // 画到旗杆左下角
        ctx.lineTo(physicalX - poleWidth/2, physicalY + lineHeight);
        // 画到旗杆右下角
        ctx.lineTo(physicalX + poleWidth/2, physicalY + lineHeight);
        // 画到旗杆右上角
        ctx.lineTo(physicalX + poleWidth/2, physicalY + flagSize);
        // 画到三角形顶点
        ctx.lineTo(physicalX + flagSize, physicalY + flagSize/2);
        // 回到旗杆右上方
        ctx.lineTo(physicalX + poleWidth/2, physicalY);
        // 闭合路径
        ctx.closePath();
      } else {
        // 向左的标记
        // 从旗杆右上角开始
        ctx.moveTo(physicalX + poleWidth/2, physicalY);
        // 画到旗杆右下角
        ctx.lineTo(physicalX + poleWidth/2, physicalY + lineHeight);
        // 画到旗杆左下角
        ctx.lineTo(physicalX - poleWidth/2, physicalY + lineHeight);
        // 画到旗杆左上角
        ctx.lineTo(physicalX - poleWidth/2, physicalY + flagSize);
        // 画到三角形顶点
        ctx.lineTo(physicalX - flagSize, physicalY + flagSize/2);
        // 回到旗杆左上方
        ctx.lineTo(physicalX - poleWidth/2, physicalY);
        // 闭合路径
        ctx.closePath();
      }

      // 填充整个路径
      ctx.fill();

      // 重置透明度
      if (!mark.pairedId) {
        ctx.globalAlpha = 1.0;
      }
    });
  }

  // 添加获取波形数据的方法
  getWaveformData() {
    return this.processedData;
  }
}

module.exports = WaveformView;
