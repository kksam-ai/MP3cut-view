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

  // 获取渲染进程文件的绝对路径
  const rendererPath = path.join(__dirname, '../renderer')
  console.log('Watching directory:', rendererPath)
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

// 处理音频切片请求
ipcMain.handle('split-audio', async (event, { filePath, segments }) => {
  console.log('收到导出请求:', { filePath, segments });
  try {
    const outputFiles = await audioProcessor.splitAudio(
      filePath,
      segments,
      (progress) => {
        event.sender.send('split-progress', progress);
      }
    );
    console.log('导出完成:', outputFiles);
    return {
      success: true,
      files: outputFiles
    };
  } catch (error) {
    console.error('导出失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 处理取消导出请求
ipcMain.handle('cancel-split-audio', async (event) => {
  try {
    console.log('收到取消导出请求');
    audioProcessor.cancelExport();
    return { success: true };
  } catch (error) {
    console.error('取消导出失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

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

  // 开发环境下的热重载配置
  if (process.env.NODE_ENV === 'development') {
    try {
      const electronReloader = require('electron-reloader');
      const path = require('path');

      // 获取主进程文件的目录
      const mainProcessDir = path.join(__dirname);

      electronReloader(module, {
        debug: true,
        // 只监听主进程相关文件
        watchDir: mainProcessDir,
        // 忽略规则
        ignore: [
          'node_modules/**/*',
          '.git/**/*',
          '**/*.md',
          '**/renderer/**'  // 忽略渲染进程文件
        ],
        // 重启前回调
        beforeReload: () => {
          // 关闭所有窗口,避免残留
          BrowserWindow.getAllWindows().forEach(w => w.close());
        }
      });

      // 监听渲染进程文件变化
      const rendererDir = path.join(__dirname, '../renderer');
      require('fs').watch(rendererDir, { recursive: true }, (eventType, filename) => {
        // 忽略 md 文件
        if (filename && !filename.endsWith('.md')) {
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.reloadIgnoringCache();
          });
        }
      });

    } catch (err) {
      console.log('Error setting up hot reload:', err);
    }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
