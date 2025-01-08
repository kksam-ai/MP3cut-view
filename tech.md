# 音频切割软件技术文档

## 技术架构

### 1. 核心技术栈
- Electron ^25.0.0 (应用框架)
- Web Audio API (音频处理)
- Canvas API (波形渲染)
- FFmpeg (音频转换)
- Node.js (系统功能)

### 2. 进程分工
1. 主进程 (Main Process)
- 文件系统操作
- 音频格式转换
- 应用生命周期
- 窗口管理

2. 渲染进程 (Renderer Process)
- 界面渲染
- 音频解析
- 波形计算
- 用户交互

### 3. 数据流转
1. 音频处理流程
- 主进程: 文件读取 -> 格式转换 -> 临时文件
- 渲染进程: 解码 -> 波形计算 -> 显示

2. 导出流程
- 标记验证
- 分段处理
- 进度通知
- 错误恢复

## 开发进度

### 1. 已完成功能
- [x] 基础框架搭建
- [x] 文件上传功能
- [x] 波形显示功能
- [x] 播放控制功能
- [x] 标记系统
- [x] 自动检测
- [x] 基础导出功能

### 2. 开发中功能
- [ ] 导出性能优化
  * 并行处理
  * 内存优化
  * 进度计算优化

### 3. 待开发功能
- [ ] 试听功能
  * 选段播放
  * 标记区间播放
  * 波形同步
- [ ] 波形导航
  * 缩放控制
  * 快速定位
- [ ] 高级播放
  * 循环播放
  * 速度控制

## 实现细节

### 1. 波形渲染
1. 设备像素比适配
```javascript
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  // 设置Canvas的物理像素大小
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // 设置Canvas的CSS像素大小
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  // 缩放绘图上下文以适配设备像素比
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  return ctx;
}
```

2. 波形数据归一化
```javascript
function normalizeWaveform(waveform) {
  const maxAmp = Math.max(...waveform);
  return waveform.map(amp => amp / maxAmp);
}
```

3. 渲染优化
```javascript
class WaveformRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = setupCanvas(canvas);
    this.cache = new Map(); // 波形缓存
    this.lastDrawnFrame = null; // 上一帧缓存
    this.renderQueued = false; // 渲染队列标记
  }

  // 智能重绘策略
  queueRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.render();
      this.renderQueued = false;
    });
  }

  // 波形渲染实现
  render() {
    // 检查是否需要重绘
    const currentFrame = this.getFrameData();
    if (this.shouldSkipRender(currentFrame)) return;

    // 清除画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制波形
    this.ctx.save();
    this.drawWaveform();
    this.drawPlayhead();
    this.drawMarkers();
    this.ctx.restore();

    // 更新缓存
    this.lastDrawnFrame = currentFrame;
  }

  // 波形绘制优化
  drawWaveform() {
    // 使用路径批量绘制
    this.ctx.beginPath();
    for (let i = 0; i < this.waveform.length; i++) {
      // 计算位置
      const x = i * (BAR_WIDTH + BAR_GAP);
      const height = this.waveform[i] * this.canvas.height;

      // 绘制波形条
      this.ctx.moveTo(x, (this.canvas.height - height) / 2);
      this.ctx.lineTo(x, (this.canvas.height + height) / 2);
    }
    this.ctx.stroke();
  }
}
```

### 2. 元数据管理
1. 时间格式化
```javascript
class TimeFormatter {
  static readonly PRECISION = 0.01; // 时间精度(秒)

  // 标准化时间值
  static normalize(time) {
    return Math.round(time / this.PRECISION) * this.PRECISION;
  }

  // 格式化显示
  static format(time, showMs = false) {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.round((time % 1) * 100);

    if (hours > 0) {
      return showMs
        ? `${hours}:${minutes}:${seconds}.${ms}`
        : `${hours}:${minutes}:${seconds}`;
    }

    return showMs
      ? `${minutes}:${seconds}.${ms}`
      : `${minutes}:${seconds}`;
  }
}
```

2. 数据不可变性
```javascript
class MetadataManager {
  // 深度冻结对象
  static deepFreeze(obj) {
    const frozen = new WeakSet();

    function freeze(obj) {
      if (frozen.has(obj)) return;
      Object.freeze(obj);
      frozen.add(obj);

      Object.values(obj).forEach(value => {
        if (typeof value === 'object' && value !== null) {
          freeze(value);
        }
      });
    }

    freeze(obj);
    return obj;
  }

  // 创建元数据
  static create(data) {
    const metadata = {
      file: {
        name: data.name,
        size: data.size,
        type: data.type,
        lastModified: data.lastModified
      },
      audio: {
        duration: data.duration,
        sampleRate: data.sampleRate,
        channels: data.channels
      },
      marks: []
    };

    return this.deepFreeze(metadata);
  }
}
```

### 3. 标记系统
1. 标记验证
```typescript
interface MarkValidationRule {
  validate(mark: Mark, marks: Mark[]): boolean;
  message: string;
}

class MarkValidator {
  private rules: MarkValidationRule[] = [
    // 时间范围检查
    {
      validate: (mark, marks) => mark.time >= 0 && mark.time <= this.duration,
      message: '标记时间超出音频范围'
    },
    // 配对状态检查
    {
      validate: (mark, marks) => {
        if (mark.type === 'start') {
          return !marks.some(m =>
            m.type === 'start' &&
            Math.abs(m.time - mark.time) < TimeFormatter.PRECISION
          );
        }
        return true;
      },
      message: '存在重复的开始标记'
    },
    // 时间间隔检查
    {
      validate: (mark, marks) => {
        const pair = marks.find(m => m.id === mark.pairedId);
        if (!pair) return true;
        return Math.abs(mark.time - pair.time) >= MIN_SEGMENT_DURATION;
      },
      message: '标记间隔小于最小片段时长'
    }
  ];

  validate(mark: Mark, marks: Mark[]): ValidationResult {
    for (const rule of this.rules) {
      if (!rule.validate(mark, marks)) {
        return { valid: false, message: rule.message };
      }
    }
    return { valid: true };
  }
}
```

2. 标记冲突处理
```javascript
class MarkManager {
  // 查找可用位置
  findAvailablePosition(time, direction = 1) {
    const step = TimeFormatter.PRECISION * direction;
    let testTime = time;

    while (testTime >= 0 && testTime <= this.duration) {
      if (!this.hasMarkAt(testTime)) {
        return testTime;
      }
      testTime += step;
    }

    return null;
  }

  // 处理标记冲突
  handleMarkConflict(mark) {
    const existingMark = this.findMarkAt(mark.time);
    if (!existingMark) return mark.time;

    // 尝试向后查找
    const afterPos = this.findAvailablePosition(mark.time, 1);
    if (afterPos !== null) return afterPos;

    // 尝试向前查找
    const beforePos = this.findAvailablePosition(mark.time, -1);
    if (beforePos !== null) return beforePos;

    throw new Error('无法找到可用的标记位置');
  }
}
```

### 4. 音频处理
1. 格式检测
```javascript
async function detectAudioFormat(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const stream = metadata.streams.find(s => s.codec_type === 'audio');
      if (!stream) return reject(new Error('No audio stream found'));

      resolve({
        codec: stream.codec_name,
        sampleRate: stream.sample_rate,
        channels: stream.channels,
        bitRate: stream.bit_rate,
        duration: parseFloat(stream.duration)
      });
    });
  });
}
```

2. 帧对齐
```javascript
class MP3FrameAligner {
  // MP3帧大小计算
  static calculateFrameSize(sampleRate, bitRate, padding) {
    const coefficient = (sampleRate < 32000) ? 72 : 144;
    return Math.floor((coefficient * bitRate * 1000 / sampleRate) + padding);
  }

  // 查找最近的帧边界
  static findNearestFrame(offset, frameSize) {
    return Math.round(offset / frameSize) * frameSize;
  }

  // 调整切割点
  static alignCutPoint(time, format) {
    const samplesPerFrame = 1152; // MP3标准
    const framesPerSecond = format.sampleRate / samplesPerFrame;
    const frameSize = this.calculateFrameSize(
      format.sampleRate,
      format.bitRate / 1000,
      0
    );

    const frameOffset = Math.round(time * framesPerSecond) * frameSize;
    return this.findNearestFrame(frameOffset, frameSize) / frameSize / framesPerSecond;
  }
}
```

## 性能优化

### 1. 波形渲染优化
- 固定采样密度(15点/秒)
- 使用峰值检测保留细节
- 优化重绘策略
- 缓存机制

### 2. 内存使用优化
- 及时清理临时文件
- 优化对象创建
- 避免内存泄漏
- 大文件处理策略

### 3. 导出性能优化
- 并行处理支持
- 内存使用优化
- 进度计算优化
- 取消机制优化

## 问题解决方案

### 1. FFmpeg相关问题
问题: 上传文件后提示 "Cannot find ffmpeg"
解决:
```javascript
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);
```

### 2. 音频解码问题
问题: node-web-audio-api 解码错误
解决:
- 主进程只负责格式转换
- 使用浏览器原生 Web Audio API
- 优化临时文件管理

### 3. Mac应用名称问题
问题: 开发环境下应用名称显示为 Electron
解决:
- 配置 package.json
- 动态修改 Info.plist
- 统一使用应用名称

### 4. 波形渲染问题
问题: 长音频波形显示不完整
解决:
- 移除采样点限制
- 优化采样算法
- 使用峰值检测

### 5. 播放同步问题
问题: 播放进度不同步
解决:
- 统一时间基准
- 优化位置计算
- 添加日志跟踪

## 开发环境

### 1. 依赖版本
- Node.js >= 16
- npm >= 8
- MacOS >= 10.15

### 2. 开发工具
- cross-env: ^7.0.3 (环境变量)
- nodemon: ^3.0.2 (热重载)
- electron-reloader: ^1.2.3 (热重载)
- chokidar: ^4.0.3 (文件监视)

### 3. 构建命令
```bash
# 开发模式
npm run dev

# 监视模式
npm run watch

# 构建应用
npm run build
```

## 测试规范

### 1. 单元测试
- 核心算法测试
- 文件操作测试
- 数据处理测试

### 2. 功能测试
- 界面操作测试
- 音频处理测试
- 导出功能测试

### 3. 性能测试
- 内存占用测试
- 大文件处理测试
- 批量导出测试
