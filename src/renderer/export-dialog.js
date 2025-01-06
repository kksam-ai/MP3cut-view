const { formatTime } = require('./mark-validator');
const { ipcRenderer } = require('electron');

/**
 * 导出对话框组件
 */
class ExportDialog {
  constructor() {
    this.init();
    this.bindEvents();

    // 存储当前任务信息
    this.metadata = null;
    this.segments = null;
  }

  /**
   * 初始化对话框
   */
  init() {
    // 创建对话框元素
    const template = `
      <div class="export-dialog-overlay">
        <div class="export-dialog">
          <div class="export-dialog-header">
            <h2>导出音频片段</h2>
          </div>
          <div class="export-dialog-content">
            <ul class="export-file-list"></ul>
            <div class="export-progress-container">
              <div class="export-progress"></div>
              <div class="export-progress-text"></div>
            </div>
          </div>
          <div class="export-dialog-footer">
            <button class="secondary" data-action="cancel">取消</button>
            <button class="primary" data-action="export">开始导出</button>
          </div>
        </div>
      </div>
    `;

    // 添加到文档
    document.body.insertAdjacentHTML('beforeend', template);

    // 保存元素引用
    this.overlay = document.querySelector('.export-dialog-overlay');
    this.dialog = document.querySelector('.export-dialog');
    this.fileList = document.querySelector('.export-file-list');
    this.progressBar = document.querySelector('.export-progress');
    this.progressText = document.querySelector('.export-progress-text');
    this.exportBtn = this.dialog.querySelector('[data-action="export"]');
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 点击遮罩层关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // 按钮事件
    this.dialog.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'cancel') {
        this.hide();
      } else if (action === 'export') {
        this.startExport();
      }
    });

    // ESC关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) {
        this.hide();
      }
    });
  }

  /**
   * 显示对话框
   * @param {ValidSegment[]} segments - 有效的音频片段列表
   * @param {Object} metadata - 音频元数据
   */
  show(segments, metadata) {
    // 保存数据
    this.segments = segments;
    this.metadata = metadata;

    // 清空列表
    this.fileList.innerHTML = '';

    // 添加文件列表
    segments.forEach(segment => {
      const li = document.createElement('li');
      li.className = 'export-file-item';
      li.innerHTML = `
        <span class="export-file-index">${segment.index}</span>
        <span class="export-file-duration">${formatTime(segment.duration)}</span>
      `;
      this.fileList.appendChild(li);
    });

    // 重置进度
    this.updateProgress(0);
    this.progressText.textContent = '';
    this.exportBtn.disabled = false;

    // 显示对话框
    this.overlay.classList.add('show');
  }

  /**
   * 隐藏对话框
   */
  hide() {
    this.overlay.classList.remove('show');
    this.metadata = null;
    this.segments = null;
  }

  /**
   * 检查对话框是否可见
   */
  isVisible() {
    return this.overlay.classList.contains('show');
  }

  /**
   * 更新进度显示
   * @param {number} percent - 进度百分比
   */
  updateProgress(percent) {
    this.progressBar.style.width = `${percent}%`;
  }

  /**
   * 开始导出
   */
  async startExport() {
    console.log('开始导出...', {
      metadata: this.metadata,
      segments: this.segments
    });

    if (!this.metadata || !this.segments) {
      console.warn('缺少必要的导出数据');
      return;
    }

    try {
      console.log('准备调用主进程...');
      // 禁用导出按钮
      this.exportBtn.disabled = true;

      // 监听进度更新
      const progressHandler = (event, progress) => {
        this.updateProgress(progress.overallProgress);
        this.progressText.textContent =
          `正在导出 ${progress.currentSegment}/${progress.totalSegments}`;
      };

      // 添加进度监听
      ipcRenderer.on('split-progress', progressHandler);

      // 调用主进程进行导出，使用正确的文件路径
      const result = await ipcRenderer.invoke('split-audio', {
        filePath: this.metadata.fileMetadata.path,
        segments: this.segments
      });
      console.log('主进程返回结果:', result);

      // 移除进度监听
      ipcRenderer.removeListener('split-progress', progressHandler);

      if (result.success) {
        // 显示成功信息
        this.progressText.textContent = '导出完成';
        setTimeout(() => this.hide(), 1500);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('导出过程出错:', error);
      // 显示错误信息
      this.progressText.textContent = `导出失败: ${error.message}`;
      this.exportBtn.disabled = false;
    }
  }
}

module.exports = ExportDialog;
