const { ipcRenderer } = require('electron')
const WaveformView = require('./waveform-view')
const AudioPlayer = require('./audio-player')
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const audioInfo = document.getElementById('audioInfo');
const canvas = document.getElementById('waveform');
const waveformView = new WaveformView(canvas);
const fs = require('fs');
const emptyState = document.getElementById('emptyState');
const loadedState = document.getElementById('loadedState');
const playBtn = document.getElementById('playBtn');
const markBtn = document.getElementById('markBtn');
const exportBtn = document.getElementById('exportBtn');
const openFileBtn = document.getElementById('openFileBtn');
const mainContent = document.querySelector('.main-content');
const loadingMask = document.getElementById('loadingMask');

// 支持的音频格式
const SUPPORTED_FORMATS = ['.m4a', '.mp3', '.mp4'];

// 创建音频播放器实例
const audioPlayer = new AudioPlayer();

// 显示加载遮罩
function showLoading() {
  loadingMask.style.display = 'flex';
  // 强制重绘
  loadingMask.offsetHeight;
  loadingMask.classList.add('visible');
}

// 隐藏加载遮罩
function hideLoading() {
  loadingMask.classList.remove('visible');
  setTimeout(() => {
    loadingMask.style.display = 'none';
  }, 300); // 等待过渡动画完成
}

// 处理音频数据
async function processAudioData(arrayBuffer) {
  // 加载音频并获取音频信息
  const audioInfo = await audioPlayer.loadAudio(arrayBuffer);

  // 使用音频缓冲区数据计算波形
  const waveformData = computeWaveform(audioPlayer.getWaveformData(), audioInfo.duration);

  return {
    sampleRate: audioInfo.sampleRate,
    duration: audioInfo.duration,
    numberOfChannels: audioInfo.numberOfChannels,
    waveform: waveformData.data,
  };
}

// 计算波形数据
function computeWaveform(channelData, duration) {
  // 计算需要的采样点数
  const PIXELS_PER_SECOND = 45;
  const BAR_WIDTH = 2;
  const BAR_GAP = 1;
  const samplesNeeded = Math.ceil(
    duration * (PIXELS_PER_SECOND / (BAR_WIDTH + BAR_GAP))
  );

  // 确保至少有1000个采样点
  const samples = Math.max(1000, samplesNeeded);

  // 计算每个块的大小
  const blockSize = Math.floor(channelData.length / samples);
  const waveform = new Float32Array(samples);

  // 使用峰值检测
  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);

    // 在每个块中找出最大绝对值
    let maxAmp = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > maxAmp) {
        maxAmp = abs;
      }
    }

    waveform[i] = maxAmp;
  }

  console.log('Computed waveform:', {
    duration: duration,
    originalLength: channelData.length,
    samplesNeeded,
    actualSamples: samples,
    blockSize
  });

  return {
    data: waveform,
    duration: duration
  };
}

// 处理文件
async function handleFile(file) {
  showLoading();

  // 重置播放状态
  if (audioPlayer.isAudioPlaying()) {
    audioPlayer.pause();
    playBtn.classList.remove('playing');
    playBtn.querySelector('.btn-text').textContent = '播放';
  }

  // 检查文件格式
  const extension = file.name.toLowerCase().match(/\.[^.]*$/)?.[0];
  if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
    hideLoading();
    alert('不支持的文件格式!');
    return;
  }

  try {
    // 发送文件到主进程处理
    const result = await ipcRenderer.invoke('process-audio-file', file.path);

    if (!result.success) {
      throw new Error(result.error);
    }

    // 读取转换后的 WAV 文件
    const wavData = await fs.promises.readFile(result.path);
    const audioData = await processAudioData(wavData.buffer);

    // 切换界面状态
    emptyState.style.display = 'none';
    loadedState.style.display = 'block';

    // 启用按钮
    playBtn.disabled = false;
    markBtn.disabled = false;
    exportBtn.disabled = false;

    // 更新音频信息
    updateAudioInfo(file, audioData);

    // 设置波形，传入波形数据和音频时长
    requestAnimationFrame(() => {
      waveformView.setWaveform(audioData.waveform, audioData.duration);
      // 波形渲染完成后隐藏加载遮罩
      hideLoading();
    });

    // 删除临时文件
    await fs.promises.unlink(result.path);

  } catch (error) {
    hideLoading();
    // 错误处理时重置状态
    playBtn.disabled = true;
    markBtn.disabled = true;
    exportBtn.disabled = true;
    alert('处理文件时出错: ' + error.message);
  }
}

// 更新音频信息显示
function updateAudioInfo(file, audioData) {
  const audioInfo = document.getElementById('audioInfo');
  audioInfo.innerHTML = `
    <div class="info-item">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
      </svg>
      <span>${file.name}</span>
    </div>
    <div class="info-item">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      <span>${formatDuration(audioData.duration)}</span>
    </div>
    <div class="info-item">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v20M2 12h20"/>
      </svg>
      <span>${formatFileSize(file.size)}</span>
    </div>
  `;
}

// 格式化时间显示
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 格式化文件大小显示
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 绑定打开文件按钮事件
openFileBtn.addEventListener('click', () => {
  fileInput.click();
});

// 点击上传
dropZone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
});

// 拖拽上传
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');

  const file = e.dataTransfer.files[0];
  if (file) {
    handleFile(file);
  }
});

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }

  // 移除所有拖放相关的视觉效果
  dropZone.classList.remove('dragover');
  mainContent.classList.remove('dragover');
}

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();

  // 添加拖放视觉效果
  if (emptyState.style.display !== 'none') {
    dropZone.classList.add('dragover');
  }
  mainContent.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();

  // 检查是否真的离开了元素
  const rect = mainContent.getBoundingClientRect();
  if (
    e.clientX <= rect.left ||
    e.clientX >= rect.right ||
    e.clientY <= rect.top ||
    e.clientY >= rect.bottom
  ) {
    dropZone.classList.remove('dragover');
    mainContent.classList.remove('dragover');
  }
}

// 为 main-content 添加拖放事件监听
mainContent.addEventListener('drop', handleDrop);
mainContent.addEventListener('dragover', handleDragOver);
mainContent.addEventListener('dragleave', handleDragLeave);

// 修改原有的拖放相关样式
const dropZoneStyle = document.createElement('style');
dropZoneStyle.textContent = `
  .main-content.dragover {
    background: rgba(33, 150, 243, 0.05);
  }
`;
document.head.appendChild(dropZoneStyle);

// 播放控制
function togglePlay() {
  if (audioPlayer.isAudioPlaying()) {
    audioPlayer.pause();
    playBtn.classList.remove('playing');
    playBtn.querySelector('.btn-text').textContent = '播放';
    waveformView.stopPlayback();
  } else {
    audioPlayer.play();
    playBtn.classList.add('playing');
    playBtn.querySelector('.btn-text').textContent = '暂停';
    waveformView.startPlayback();
  }
}

// 绑定播放按钮事件
playBtn.addEventListener('click', togglePlay);

// 绑定空格键控制
document.addEventListener('keydown', (e) => {
  // 如果正在编辑输入框，不处理空格键
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return;
  }

  if (e.code === 'Space' && !playBtn.disabled) {
    e.preventDefault(); // 防止页面滚动
    togglePlay();
  }
});

// 监听播放结束
audioPlayer.onEnded = () => {
  playBtn.classList.remove('playing');
  playBtn.querySelector('.btn-text').textContent = '播放';
  waveformView.stopPlayback();
  waveformView.setPlaybackPosition(0);
};

// 更新播放位置
function updatePlaybackPosition() {
  if (audioPlayer.isAudioPlaying()) {
    waveformView.setPlaybackPosition(audioPlayer.getCurrentTime());
    requestAnimationFrame(updatePlaybackPosition);
  }
}

// 监听播放状态变化
audioPlayer.onPlay = () => {
  updatePlaybackPosition();
};

// 处理时间选择
waveformView.onTimeSelect = (time) => {
  // 设置音频播放位置
  audioPlayer.seek(time);

  // 更新播放条位置
  waveformView.setPlaybackPosition(time);

  // 如果当前正在播放，继续播放
  if (audioPlayer.isAudioPlaying()) {
    audioPlayer.play();
  }
};
