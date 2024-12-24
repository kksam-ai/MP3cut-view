class WaveformView {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.waveformData = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    // 设置 canvas 大小以匹配显示大小
    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
    this.render();
  }

  setWaveform(data) {
    this.waveformData = data;
    this.render();
  }

  render() {
    if (!this.waveformData) return;

    const { width, height } = this.canvas;
    const ctx = this.context;

    // 清空画布
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    // 绘制波形
    ctx.beginPath();
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;

    const step = width / this.waveformData.length;
    const middle = height / 2;

    for (let i = 0; i < this.waveformData.length; i++) {
      const x = i * step;
      const amplitude = this.waveformData[i] * height;

      if (i === 0) {
        ctx.moveTo(x, middle + amplitude);
      } else {
        ctx.lineTo(x, middle + amplitude);
      }
    }

    ctx.stroke();
  }
}

module.exports = WaveformView;
