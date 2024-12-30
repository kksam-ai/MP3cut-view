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
const exportBtn = document.getElementById('exportBtn');
const openFileBtn = document.getElementById('openFileBtn');
const mainContent = document.querySelector('.main-content');
const loadingMask = document.getElementById('loadingMask');
const MarkManager = require('./mark-manager');

// 支持的音频格式
const SUPPORTED_FORMATS = ['.m4a', '.mp3', '.mp4'];

// 创建音频播放器实例
const audioPlayer = new AudioPlayer();

// 在文件顶部的常量声明后添加
const markManager = new MarkManager();

// 获取手动标记按钮
const startMarkBtn = document.querySelector('.mark-btn.start-mark');
const endMarkBtn = document.querySelector('.mark-btn.end-mark');

// 获取清空标记按钮
const clearMarksBtn = document.querySelector('.clear-marks');

// 获取自动标记相关元素
const thresholdSlider = document.getElementById('thresholdSlider');
const silenceSlider = document.getElementById('silenceSlider');
const thresholdValue = thresholdSlider.parentElement.querySelector('.slider-value');
const silenceValue = silenceSlider.parentElement.querySelector('.slider-value');
const autoMarkBtn = document.querySelector('.auto-mark-btn');

// 设置默认参数
const DEFAULT_THRESHOLD = 3;   // 3% 的最大振幅
const DEFAULT_SILENCE = 1.0;   // 1.0 秒的留白

// 初始化滑块值
thresholdSlider.value = DEFAULT_THRESHOLD;
silenceSlider.value = DEFAULT_SILENCE;
thresholdValue.textContent = `${DEFAULT_THRESHOLD}%`;
silenceValue.textContent = `${DEFAULT_SILENCE}s`;

// 更新阈值显示
thresholdSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  thresholdValue.textContent = `${value}%`;
});

// 更新留白显示
silenceSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  silenceValue.textContent = `${value}s`;
});

// 启用按钮时同时启用标记按钮
function enableButtons() {
  playBtn.disabled = false;
  exportBtn.disabled = false;
  startMarkBtn.disabled = false;
  endMarkBtn.disabled = false;
  clearMarksBtn.disabled = false;
  autoMarkBtn.disabled = false;
}

// 禁用按钮时同时禁用标记按钮
function disableButtons() {
  playBtn.disabled = true;
  exportBtn.disabled = true;
  startMarkBtn.disabled = true;
  endMarkBtn.disabled = true;
  clearMarksBtn.disabled = true;
  autoMarkBtn.disabled = true;
}

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

  // 使用 AudioBuffer 的准确时长
  const duration = audioInfo.audioBuffer.duration;

  // 使用音频缓冲区数据计算波形
  const waveformData = computeWaveform(audioPlayer.getWaveformData(), duration);

  return {
    sampleRate: audioInfo.sampleRate,
    duration: duration,
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
  // 计算每秒的波形条数
  const BARS_PER_SECOND = PIXELS_PER_SECOND / (BAR_WIDTH + BAR_GAP);

  // 计算总的波形条数
  const samplesNeeded = Math.ceil(
    duration * BARS_PER_SECOND
  );

  // 使用实际需要的采样点数
  const samples = samplesNeeded;

  // 计算每个块的大小
  const blockSize = Math.ceil(channelData.length / samples);
  const waveform = new Float32Array(samples);

  // 使用峰值检测
  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channelData.length);

    // 确保至少有一个采样点
    if (start >= channelData.length) break;

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
    blockSize,
    barsPerSecond: BARS_PER_SECOND
  });

  return {
    data: waveform,
    duration: duration
  };
}

// 处理文件
async function handleFile(file) {
  showLoading();
  let tempFilePath = null;

  // 重置播放状态
  if (audioPlayer.isAudioPlaying()) {
    audioPlayer.pause();
    playBtn.classList.remove('playing');
    playBtn.querySelector('.btn-text').textContent = '播放';
  }

  // 重置标记
  markManager.clear();
  updateMarkList();  // 我们稍后会实现这个函数

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
      throw new Error(result.error || '处理文件失败');
    }

    tempFilePath = result.path;

    // 读取转换后的 WAV 文件
    const wavData = await fs.promises.readFile(tempFilePath);

    // 处理音频数据
    const audioData = await processAudioData(wavData.buffer);

    // 切换界面状态
    emptyState.style.display = 'none';
    loadedState.style.display = 'block';

    // 启用按钮
    enableButtons();

    // 更新音频信息
    updateAudioInfo(file, audioData);

    // 设置波形
    requestAnimationFrame(() => {
      waveformView.setWaveform(audioData.waveform, audioData.duration);
      hideLoading();
    });

  } catch (error) {
    console.error('Error processing file:', error);
    hideLoading();

    // 错误处理时禁用所有按钮
    disableButtons();

    // 显示具体错误信息
    alert('处理文件时出错: ' + (error.message || '未知错误'));

  } finally {
    // 确保所有处理完成后再删除临时文件
    if (tempFilePath) {
      try {
        // 添加小延迟确保文件不在使用中
        setTimeout(async () => {
          try {
            await fs.promises.unlink(tempFilePath);
          } catch (unlinkError) {
            console.error('Error deleting temp file:', unlinkError);
          }
        }, 1000);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
    }
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
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  return [
    hours > 0 ? hours.toString().padStart(2, '0') : null,
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
    ms.toString().padStart(2, '0')
  ].filter(Boolean).join(':');
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

// 更新标记列表显示
function updateMarkList() {
  const markList = document.querySelector('.mark-list');
  const marks = markManager.getAllMarks();

  if (marks.length === 0) {
    markList.innerHTML = '<div class="empty-tip">暂无标记</div>';
    return;
  }

  // 按时间排序
  marks.sort((a, b) => a.time - b.time);

  markList.innerHTML = marks.map(mark => {
    const isPaired = mark.pairedId !== null;
    const time = formatDuration(mark.time);
    const type = mark.type === 'start' ? '开始' : '结束';
    const typeClass = mark.type === 'start' ? 'mark-start' : 'mark-end';
    const statusClass = isPaired ? 'mark-paired' : 'mark-unpaired';

    return `
      <div class="mark-item ${typeClass} ${statusClass}" data-mark-id="${mark.id}">
        <div class="mark-info">
          <span class="mark-type">${type}</span>
          <span class="mark-time">${time}</span>
        </div>
        <button class="delete-mark" onclick="removeMark('${mark.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

// 删除标记的处理函数
window.removeMark = function(id) {
  markManager.removeMark(id);
  updateMarkList();
  waveformView.setMarks(markManager.getAllMarks());
};

// 添加标记移动事件处理
waveformView.onMarkMove = (markId, newTime) => {
  if (markManager.updateMarkTime(markId, newTime)) {
    updateMarkList();
    waveformView.setMarks(markManager.getAllMarks());
  }
};

// 添加绿旗标记
startMarkBtn.addEventListener('click', () => {
  const currentTime = audioPlayer.getCurrentTime();
  const mark = markManager.addMark('start', currentTime);
  updateMarkList();
  waveformView.setMarks(markManager.getAllMarks());
});

// 添加红旗标记
endMarkBtn.addEventListener('click', () => {
  const currentTime = audioPlayer.getCurrentTime();
  const mark = markManager.addMark('end', currentTime);
  updateMarkList();
  waveformView.setMarks(markManager.getAllMarks());
});

// 添加清空标记功能
clearMarksBtn.addEventListener('click', () => {
  // 如果没有标记，直接返回
  if (markManager.getAllMarks().length === 0) {
    return;
  }

  // 显示确认对话框
  const confirmed = confirm('确定要清空所有标记吗？此操作不可撤销。');

  if (confirmed) {
    // 清空标记
    markManager.clear();
    // 更新标记列表显示
    updateMarkList();
    // 更新波形视图
    waveformView.setMarks([]);
  }
});

// 自动标记功能
function autoMark(waveformData, threshold, silenceDuration) {
  const marks = [];
  let isInSilence = false;
  let silenceStart = 0;
  let silenceCount = 0;
  let lastMarkType = null;
  let segmentStart = 0;  // 记录当前段落的开始时间
  let validSampleCount = 0;  // 记录有效样本数量
  let totalSampleCount = 0;  // 记录总样本数量
  let maxAmplitude = 0;  // 记录最大振幅

  const samplesPerSecond = waveformData.length / audioPlayer.getDuration();
  const silenceSamples = Math.floor(silenceDuration * samplesPerSecond);
  const normalizedThreshold = threshold / 100;
  const MIN_SEGMENT_DURATION = 1.0;  // 最小段落时长（秒）
  const MIN_VALID_RATIO = 0.3;       // 最小有效内容比例
  const MIN_AMPLITUDE_THRESHOLD = normalizedThreshold * 2;  // 最小有效振幅阈值

  // 添加初始标记
  marks.push({
    type: 'start',
    time: 0
  });
  lastMarkType = 'start';
  segmentStart = 0;

  // 检查段落是否有效
  function isValidSegment(start, end) {
    const duration = end - start;
    const validRatio = validSampleCount / totalSampleCount;

    return duration >= MIN_SEGMENT_DURATION &&
           validRatio >= MIN_VALID_RATIO &&
           maxAmplitude >= MIN_AMPLITUDE_THRESHOLD;
  }

  // 遍历波形数据
  for (let i = 0; i < waveformData.length; i++) {
    const amplitude = waveformData[i];
    const time = i / samplesPerSecond;

    if (amplitude < normalizedThreshold) {
      // 在静音区域
      if (!isInSilence) {
        silenceStart = time;
        isInSilence = true;
      }
      silenceCount++;
    } else {
      // 在有声音区域
      if (isInSilence && silenceCount >= silenceSamples) {
        // 找到一个足够长的静音段
        // 检查前一个段落是否有效
        if (isValidSegment(segmentStart, silenceStart)) {
          marks.push({
            type: 'end',
            time: silenceStart
          });
          lastMarkType = 'end';

          // 如果不是最后一个样本，添加开始标记
          if (i < waveformData.length - 1) {
            marks.push({
              type: 'start',
              time: time
            });
            lastMarkType = 'start';
            // 重置段落统计
            segmentStart = time;
            validSampleCount = 0;
            totalSampleCount = 0;
            maxAmplitude = 0;
          }
        }
      }
      isInSilence = false;
      silenceCount = 0;

      // 统计有效样本
      if (amplitude >= normalizedThreshold) {
        validSampleCount++;
        maxAmplitude = Math.max(maxAmplitude, amplitude);
      }
      totalSampleCount++;
    }
  }

  // 处理最后一个段落
  if (lastMarkType === 'start') {
    const endTime = audioPlayer.getDuration();
    if (isValidSegment(segmentStart, endTime)) {
      marks.push({
        type: 'end',
        time: endTime
      });
    } else {
      // 如果最后一个段落无效，移除对应的开始标记
      marks.pop();
    }
  }

  return marks;
}

// 添加自动标记按钮事件
autoMarkBtn.addEventListener('click', () => {
  // 获取当前设置的参数
  const threshold = parseFloat(thresholdSlider.value);
  const silence = parseFloat(silenceSlider.value);

  // 获取波形数据
  const waveformData = waveformView.getWaveformData();

  // 清除现有标记
  markManager.clear();

  // 执行自动标记
  const marks = autoMark(waveformData, threshold, silence);

  // 添加标记
  marks.forEach(mark => {
    markManager.addMark(mark.type, mark.time);
  });

  // 更新界面
  updateMarkList();
  waveformView.setMarks(markManager.getAllMarks());
});
