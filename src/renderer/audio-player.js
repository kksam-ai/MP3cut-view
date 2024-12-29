class AudioPlayer {
  constructor() {
    // 创建音频上下文
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // 初始化音频元素
    this._initAudio();

    // 创建分析器节点
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.connect(this.audioContext.destination);

    // 播放状态
    this.isPlaying = false;

    // 用于波形计算的音频缓冲区
    this.audioBuffer = null;

    // 回调函数
    this.onEnded = null;
    this.onPlay = null;

    // 保存当前的 Blob URL
    this.currentBlobUrl = null;
  }

  // 初始化音频元素
  _initAudio() {
    // 移除旧的事件监听
    if (this.audio) {
      this.audio.removeEventListener('ended', this._handleEnded);
    }

    // 创建新的音频元素
    this.audio = new Audio();

    // 绑定事件处理
    this._handleEnded = this._handleEnded.bind(this);
    this.audio.addEventListener('ended', this._handleEnded);
  }

  // 加载音频文件
  async loadAudio(arrayBuffer) {
    try {
      // 断开并清理旧的连接
      this._cleanup();

      // 创建新的音频元素
      this._initAudio();

      // 确保播放时间重置为0
      this.audio.currentTime = 0;

      // 创建新的媒体源节点
      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);

      // 创建 Blob URL
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      // 先清理旧的 URL
      if (this.currentBlobUrl) {
        URL.revokeObjectURL(this.currentBlobUrl);
      }
      this.currentBlobUrl = URL.createObjectURL(blob);

      // 加载音频
      this.audio.src = this.currentBlobUrl;

      // 等待加载完成
      await new Promise((resolve, reject) => {
        this.audio.onloadeddata = resolve;
        this.audio.onerror = reject;
      });

      // 解码音频数据
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));

      return {
        duration: this.audio.duration,
        sampleRate: this.audioContext.sampleRate,
        numberOfChannels: this.source.channelCount,
        audioBuffer: this.audioBuffer
      };
    } catch (error) {
      // 出错时确保清理资源
      this._cleanup();
      throw error;
    }
  }

  // 播放控制
  play() {
    if (!this.isPlaying) {
      this.audioContext.resume();
      this.audio.play();
      this.isPlaying = true;
      if (this.onPlay) {
        this.onPlay();
      }
    }
  }

  pause() {
    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  // 设置播放位置
  seek(time) {
    this.audio.currentTime = time;
  }

  // 获取当前播放位置
  getCurrentTime() {
    return this.audio.currentTime;
  }

  // 获取音频持续时间
  getDuration() {
    return this.audio.duration;
  }

  // 获取播放状态
  isAudioPlaying() {
    return this.isPlaying;
  }

  // 处理播放结束
  _handleEnded() {
    this.isPlaying = false;
    this.audio.currentTime = 0;
    if (this.onEnded) {
      this.onEnded();
    }
  }

  // 清理资源
  _cleanup() {
    // 停止播放
    if (this.isPlaying) {
      this.pause();
    }

    // 断开旧的连接
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    // 清理音频元素
    if (this.audio) {
      this.audio.removeEventListener('ended', this._handleEnded);
      this.audio.pause();
      this.audio.src = '';
    }

    // 清理 Blob URL
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    // 重置状态
    this.isPlaying = false;
    this.audioBuffer = null;
  }

  // 清理资源（供外部调用）
  destroy() {
    this._cleanup();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  // 获取波形数据
  getWaveformData() {
    if (!this.audioBuffer) {
      return null;
    }
    return this.audioBuffer.getChannelData(0);
  }
}

module.exports = AudioPlayer;
