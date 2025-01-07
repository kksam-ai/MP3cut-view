const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const audioProcessor = require('./audio-processor')

// 设置应用名称
const APP_NAME = 'MP3cut'

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    title: APP_NAME,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#00000000',
      symbolColor: '#FFFFFF',
      height: 32
    } : false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile(path.join(__dirname, '../renderer/index.html'))

  // 设置窗口标题
  win.setTitle(APP_NAME)

  // 添加平台类名到 body
  win.webContents.on('dom-ready', () => {
    win.webContents.executeJavaScript(`
      document.body.classList.add('platform-${process.platform}');
    `);
  });

  // 获取渲染进程文件的绝对路径
  const rendererPath = path.join(__dirname, '../renderer')
  console.log('Watching directory:', rendererPath)
}

// 创建自定义菜单
function createCustomMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    // 仅在 Mac 上显示应用菜单
    ...(isMac ? [{
      label: APP_NAME,
      submenu: [
        { role: 'about', label: `关于 ${APP_NAME}` },
        { type: 'separator' },
        { role: 'hide', label: `隐藏 ${APP_NAME}` },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: `退出 ${APP_NAME}` }
      ]
    }] : [])
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
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
  // 设置应用名称
  if (process.platform === 'darwin') {
    app.name = APP_NAME
    app.setName(APP_NAME)
  }

  // 创建自定义菜单
  createCustomMenu()

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
