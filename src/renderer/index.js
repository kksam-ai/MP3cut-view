const { ipcRenderer } = require('electron')
const WaveformView = require('./waveform-view')
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const audioInfo = document.getElementById('audioInfo');
const canvas = document.getElementById('waveform');
const waveformView = new WaveformView(canvas);
const fs = require('fs');

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

    // 显示波形
    waveformView.setWaveform(audioData.waveform);

    // 删除临时文件
    await fs.promises.unlink(result.path);

  } catch (error) {
    alert('处理文件时出错: ' + error.message);
  }
}

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
