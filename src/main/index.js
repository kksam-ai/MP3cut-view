const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const audioProcessor = require('./audio-processor')
const chokidar = require('chokidar')

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

  // 获取渲染进程文件的绝对路径
  const rendererPath = path.join(__dirname, '../renderer')
  console.log('Watching directory:', rendererPath)

  // 监听文件变化
  const watcher = chokidar.watch(rendererPath, {
    ignored: /(^|[\/\\])\../, // 忽略隐藏文件
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100
    }
  });

  // 添加日志记录
  watcher
    .on('ready', () => console.log('Initial scan complete. Ready for changes...'))
    .on('change', filePath => {
      console.log('File changed:', filePath)
      // 添加小延迟确保文件写入完成
      setTimeout(() => {
        try {
          win.webContents.reload()
          console.log('Page reloaded successfully')
        } catch (error) {
          console.error('Error reloading page:', error)
        }
      }, 100)
    })
    .on('error', error => console.error('Watcher error:', error));

  // 当窗口关闭时停止监听
  win.on('closed', () => {
    watcher.close()
  })
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

try {
  require('electron-reloader')(module, {
    debug: true,
    watchRenderer: true
  });
} catch (_) { console.log('Error'); }
