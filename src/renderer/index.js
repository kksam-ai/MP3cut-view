const { ipcRenderer } = require('electron')
const WaveformView = require('./waveform-view')
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

// 支持的音频格式
const SUPPORTED_FORMATS = ['.m4a', '.mp3', '.mp4'];

// 处理音频数据
async function processAudioData(arrayBuffer) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const waveformData = computeWaveform(audioBuffer);

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      waveform: waveformData
    };
  } finally {
    audioContext.close();
  }
}

// 计算波形数据
function computeWaveform(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  const samples = 1000;
  const blockSize = Math.floor(channelData.length / samples);
  const waveform = new Float32Array(samples);

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    let sum = 0;

    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j]);
    }

    waveform[i] = sum / blockSize;
  }

  return waveform;
}

// 处理文件
async function handleFile(file) {
  // 检查文件格式
  const extension = file.name.toLowerCase().match(/\.[^.]*$/)?.[0];
  if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
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

    // 显示文件信息
    const size = (result.size / (1024 * 1024)).toFixed(2);
    const duration = audioData.duration.toFixed(2);
    audioInfo.style.display = 'block';
    audioInfo.innerHTML = `
      文件名: ${file.name}<br>
      大小: ${size}MB<br>
      时长: ${duration}秒<br>
      采样率: ${audioData.sampleRate}Hz
    `;

    // 切换界面状态
    emptyState.style.display = 'none';
    loadedState.style.display = 'block';

    // 启用按钮
    playBtn.disabled = false;
    markBtn.disabled = false;
    exportBtn.disabled = false;

    // 更新音频信息
    updateAudioInfo(file, audioData);

    // 重要：等待下一帧再设置波形，确保canvas已经显示
    requestAnimationFrame(() => {
      waveformView.setWaveform(audioData.waveform);
    });

    // 删除临时文件
    await fs.promises.unlink(result.path);

  } catch (error) {
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
