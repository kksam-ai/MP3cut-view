const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const audioProcessor = require('./audio-processor')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile(path.join(__dirname, '../renderer/index.html'))
  win.webContents.openDevTools()
}

// 处理音频文件
async function handleAudioFile(filePath) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error('文件不存在')
    }

    // 读取文件信息
    const stats = fs.statSync(filePath)

    // 转换音频文件
    const wavPath = await audioProcessor.convertToWav(filePath)

    return {
      path: wavPath,  // 返回转换后的 WAV 文件路径
      size: stats.size,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

app.whenReady().then(() => {
  // 监听渲染进程发来的处理文件请求
  ipcMain.handle('process-audio-file', async (event, filePath) => {
    return await handleAudioFile(filePath)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
