class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.audio = null;
    this.analyser = null;
    this.source = null;
    this.isPlaying = false;
    this.audioBuffer = null;
    this.onEnded = null;
    this.onPlay = null;
    this.currentBlobUrl = null;

    // 初始化音频上下文和节点
    this._initAudioContext();
  }

  _initAudioContext() {
    // 如果已存在音频上下文，先关闭它
    if (this.audioContext) {
      this.audioContext.close();
    }

    // 创建新的音频上下文
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // 创建分析器节点
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.connect(this.audioContext.destination);
  }

  _initAudio() {
    // 完全清理旧的音频元素
    if (this.audio) {
      this.audio.removeEventListener('ended', this._handleEnded);
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }

    // 创建新的音频元素
    this.audio = new Audio();
    this._handleEnded = this._handleEnded.bind(this);
    this.audio.addEventListener('ended', this._handleEnded);
  }

  async loadAudio(arrayBuffer) {
    try {
      // 完全清理旧的资源
      await this._cleanup();

      // 重新初始化音频上下文
      this._initAudioContext();

      // 创建新的音频元素
      this._initAudio();

      // 先解码音频数据
      try {
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      } catch (decodeError) {
        console.error('Failed to decode audio data:', decodeError);
        throw new Error('音频解码失败');
      }

      // 创建新的媒体源节点
      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);

      // 创建 Blob URL
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      if (this.currentBlobUrl) {
        URL.revokeObjectURL(this.currentBlobUrl);
      }
      this.currentBlobUrl = URL.createObjectURL(blob);

      // 加载音频
      this.audio.src = this.currentBlobUrl;

      // 等待加载完成
      try {
        await new Promise((resolve, reject) => {
          const loadTimeout = setTimeout(() => {
            reject(new Error('音频加载超时'));
          }, 10000);

          this.audio.onloadeddata = () => {
            clearTimeout(loadTimeout);
            resolve();
          };

          this.audio.onerror = (e) => {
            clearTimeout(loadTimeout);
            reject(new Error('音频加载失败: ' + (e.message || '未知错误')));
          };
        });
      } catch (loadError) {
        console.error('Failed to load audio:', loadError);
        throw loadError;
      }

      return {
        duration: this.audio.duration,
        sampleRate: this.audioContext.sampleRate,
        numberOfChannels: this.audioBuffer.numberOfChannels,
        audioBuffer: this.audioBuffer
      };
    } catch (error) {
      await this._cleanup();
      const errorMessage = error.message || '音频处理失败';
      console.error('Audio loading error:', error);
      throw new Error(errorMessage);
    }
  }

  async _cleanup() {
    // 停止播放
    if (this.isPlaying) {
      this.pause();
    }

    // 断开并清理媒体源节点
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) {
        console.warn('Error disconnecting source:', e);
      }
      this.source = null;
    }

    // 清理音频元素
    if (this.audio) {
      this.audio.removeEventListener('ended', this._handleEnded);
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }

    // 清理 Blob URL
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    // 关闭并清理音频上下文
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (e) {
        console.warn('Error closing audio context:', e);
      }
      this.audioContext = null;
    }

    // 重置状态
    this.isPlaying = false;
    this.audioBuffer = null;
  }

  // 播放控制
  play() {
    if (!this.isPlaying) {
      // 如果已经播放到末尾，则从头开始播放
      if (this.audio.currentTime >= this.audio.duration) {
        this.audio.currentTime = 0;
      }
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
    if (this.onEnded) {
      this.onEnded();
    }
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
