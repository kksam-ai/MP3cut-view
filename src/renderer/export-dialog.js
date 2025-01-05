const { formatTime } = require('./mark-validator');

/**
 * 导出对话框组件
 */
class ExportDialog {
  constructor() {
    this.init();
    this.bindEvents();
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
   */
  show(segments) {
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

    // 显示对话框
    this.overlay.classList.add('show');
  }

  /**
   * 隐藏对话框
   */
  hide() {
    this.overlay.classList.remove('show');
  }

  /**
   * 检查对话框是否可见
   */
  isVisible() {
    return this.overlay.classList.contains('show');
  }

  /**
   * 开始导出
   * 这里先预留，后续实现具体的导出逻辑
   */
  startExport() {
    console.log('开始导出...');
    // TODO: 实现导出逻辑
  }
}

// 导出模块
module.exports = ExportDialog;
