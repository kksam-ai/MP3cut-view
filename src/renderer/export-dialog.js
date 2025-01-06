const { formatTime } = require('./mark-validator');
const { ipcRenderer } = require('electron');

// 导出对话框状态枚举
const ExportState = {
  SETUP: 'setup',      // 设置状态
  PROCESSING: 'processing', // 处理状态
  RESULT: 'result'     // 结果状态
};

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
    this.currentState = ExportState.SETUP;
    this.isExporting = false;
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
            <button class="primary" data-action="ok" style="display: none;">确定</button>
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
    this.cancelBtn = this.dialog.querySelector('[data-action="cancel"]');
    this.okBtn = this.dialog.querySelector('[data-action="ok"]');
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 点击遮罩层关闭(仅在设置状态可用)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay && this.currentState === ExportState.SETUP) {
        this.hide();
      }
    });

    // 按钮事件
    this.dialog.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'cancel') {
        if (this.currentState === ExportState.PROCESSING) {
          this.cancelExport();
        } else {
          this.hide();
        }
      } else if (action === 'export') {
        this.startExport();
      } else if (action === 'ok') {
        this.hide();
      }
    });

    // ESC关闭(仅在设置状态可用)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible() && this.currentState === ExportState.SETUP) {
        this.hide();
      }
    });
  }

  /**
   * 切换状态并更新UI
   * @param {string} newState - 新状态
   * @param {boolean} [isSuccess] - 是否成功（仅在结果状态有效）
   */
  setState(newState, isSuccess) {
    this.currentState = newState;

    // 重置所有状态相关的类
    this.dialog.classList.remove('state-setup', 'state-processing', 'state-result', 'success', 'error');

    // 添加当前状态的类
    this.dialog.classList.add(`state-${this.currentState}`);

    // 如果是结果状态，添加成功/失败的类
    if (newState === ExportState.RESULT && typeof isSuccess === 'boolean') {
      this.dialog.classList.add(isSuccess ? 'success' : 'error');
    }

    // 更新按钮显示
    switch (this.currentState) {
      case ExportState.SETUP:
        this.exportBtn.style.display = '';
        this.cancelBtn.style.display = '';
        this.okBtn.style.display = 'none';
        break;
      case ExportState.PROCESSING:
        this.exportBtn.style.display = 'none';
        this.cancelBtn.style.display = '';
        this.okBtn.style.display = 'none';
        break;
      case ExportState.RESULT:
        this.exportBtn.style.display = 'none';
        this.cancelBtn.style.display = 'none';
        this.okBtn.style.display = '';
        break;
    }
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

    // 设置初始状态
    this.setState(ExportState.SETUP);

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
    this.isExporting = false;
    this.setState(ExportState.SETUP);
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
    // 确保百分比在有效范围内
    const validPercent = Math.max(0, Math.min(100, percent));
    this.progressBar.style.width = `${validPercent}%`;
  }

  /**
   * 取消导出
   */
  async cancelExport() {
    if (!this.isExporting) return;

    try {
      // 通知主进程取消导出
      const result = await ipcRenderer.invoke('cancel-split-audio');

      // 更新状态
      this.isExporting = false;
      this.setState(ExportState.RESULT, false);
      this.progressText.textContent = '导出已取消';
    } catch (error) {
      console.error('取消导出失败:', error);
      this.setState(ExportState.RESULT, false);
      this.progressText.textContent = `取消导出失败: ${error.message}`;
    }
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
      // 切换到处理状态
      this.setState(ExportState.PROCESSING);
      this.isExporting = true;

      // 监听进度更新
      const progressHandler = (event, progress) => {
        if (!this.isExporting) return;

        // 更新进度条
        this.updateProgress(progress.overallProgress);

        // 更新进度文本，添加百分比显示
        this.progressText.textContent =
          `正在导出 ${progress.currentSegment}/${progress.totalSegments} (${Math.round(progress.overallProgress)}%)`;

        // 添加调试日志
        console.log('进度更新:', progress);
      };

      // 添加进度监听
      ipcRenderer.on('split-progress', progressHandler);

      // 调用主进程进行导出
      const result = await ipcRenderer.invoke('split-audio', {
        filePath: this.metadata.fileMetadata.path,
        segments: this.segments
      });
      console.log('主进程返回结果:', result);

      // 移除进度监听
      ipcRenderer.removeListener('split-progress', progressHandler);

      // 更新状态
      this.isExporting = false;

      if (result.success) {
        // 切换到成功的结果状态
        this.setState(ExportState.RESULT, true);
        this.progressText.textContent = `导出完成 - 已生成 ${result.files.length} 个文件`;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('导出过程出错:', error);
      // 更新状态
      this.isExporting = false;
      // 切换到失败的结果状态
      this.setState(ExportState.RESULT, false);
      this.progressText.textContent = `导出失败: ${error.message}`;
    }
  }
}

module.exports = ExportDialog;
