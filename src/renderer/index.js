const { ipcRenderer } = require('electron')
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const audioInfo = document.getElementById('audioInfo');

// 支持的音频格式
const SUPPORTED_FORMATS = ['.m4a', '.mp3', '.mp4'];

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
    const result = await ipcRenderer.invoke('process-audio-file', file.path)

    if (!result.success) {
      throw new Error(result.error)
    }

    // 显示文件信息
    const size = (result.size / (1024 * 1024)).toFixed(2); // 转换为MB
    audioInfo.style.display = 'block';
    audioInfo.innerHTML = `
      文件名: ${file.name}<br>
      大小: ${size}MB<br>
      类型: ${file.type}
    `;

  } catch (error) {
    alert('处理文件时出错: ' + error.message)
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
