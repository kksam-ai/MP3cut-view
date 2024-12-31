# 音频导出功能技术方案

## 界面设计分析
1. 导出设置界面
- 音频质量选项(原始/高/中/低)
- 文件名设置(原文件名/自定义)
- 文件列表预览
  * 显示每个切片的序号
  * 显示预计时长
  * 可能需要添加预计文件大小显示
- 底部提示信息(未配对标记处理说明)
- 导出目录设置（默认原文件目录/自定义目录）
- 操作按钮(开始导出/取消)

2. 处理中界面
- 显示"正在处理"状态
- 可以添加:
  * 进度百分比
  * 当前处理文件信息
  * 预计剩余时间
- 取消按钮

3. 完成界面
- 显示导出完成状态
- OK按钮关闭
- 可以添加:
  * 成功/失败数量统计
  * 导出文件位置链接

## 技术方案

### 音频处理流程
1. 检测原始音频参数
2. 根据标记信息切分音频
3. 转换为目标格式并导出

### 文件处理流程
1. 创建临时工作目录
2. 音频切片处理
3. 格式转换
4. 清理临时文件

### 进度计算方式
1. 预处理进度 (10%)
2. 切片处理进度 (60%)
3. 格式转换进度 (30%)

### 音频参数处理
```typescript
interface AudioExportConfig {
  quality: 'original' | 'high' | 'medium' | 'low';
  outputDir: string;
  namePattern: string;
  startIndex: number;
}

interface AudioQualityParams {
  original: {
    // 保持原始参数
    keepOriginal: true
  },
  high: {
    bitrate: '320k',
    quality: 0
  },
  medium: {
    bitrate: '192k',
    quality: 4
  },
  low: {
    bitrate: '128k',
    quality: 7
  }
}
```

### 文件命名处理
```typescript
interface FileNaming {
  pattern: string;  // 文件名模式
  index: number;    // 起始序号
  padding: number;  // 序号位数(4)

  // 生成实际文件名
  generateFileName(index: number): string;

  // 验证文件名合法性
  validatePattern(pattern: string): boolean;
}
```

### 导出进度跟踪
```typescript
interface ExportProgress {
  totalFiles: number;
  currentIndex: number;
  currentFile: string;
  percentage: number;
  timeRemaining: number;
  status: 'preparing' | 'processing' | 'completed' | 'error';
}
```

### 错误处理增强
```typescript
interface ExportError {
  type: 'file_access' | 'conversion' | 'memory' | 'cancelled';
  file?: string;
  message: string;
  recoverable: boolean;
}
```

## 开发步骤

### 第一阶段基础功能

#### 1. UI框架搭建
```typescript
// 步骤 1.1: 创建导出对话框组件
- 创建 ExportDialog 类
- 实现三个状态的模板
- 添加遮罩层样式
- 实现基础的显示/隐藏

// 步骤 1.2: 实现状态管理
- 定义导出状态枚举
- 实现状态切换逻辑
- 添加相应的事件处理

// 步骤 1.3: 开发文件列表预览
- 实现文件名生成逻辑
- 显示预计时长
- 添加列表滚动
```

#### 2. 标记验证实现
```typescript
// 步骤 2.1: 标记检查
- 实现标记配对验证
- 过滤无效标记
- 生成有效标记对列表

// 步骤 2.2: 导出数据准备
- 计算每个片段的时长
- 生成文件名列表
- 验证输出路径
```

#### 3. 文件处理开发
```typescript
// 步骤 3.1: 音频切片
- 实现音频数据提取
- 创建临时文件管理
- 添加错误处理

// 步骤 3.2: 格式转换
- 集成 ffmpeg 转换
- 实现 mp3 编码
- 处理临时文件清理
```

#### 4. 进度显示完善
```typescript
// 步骤 4.1: 进度计算
- 实现进度百分比计算
- 添加状态文本显示
- 实现取消功能

// 步骤 4.2: 错误处理
- 添加错误提示
- 实现错误恢复
- 完善日志记录
```

### 第二阶段功能增强
- 音频质量选项
- 自定义输出目录
- 文件名自定义
- 详细进度显示
- 高级错误处理

### 第三阶段优化提升
- 并行处理优化
- 内存使用优化
- 进度计算优化
- UI响应优化

## 需要注意的细节

1. 界面交互:
- 使用模态对话框
- 半透明遮罩层
- 动画过渡效果
- 响应键盘事件(ESC关闭等)

2. 文件处理:
- 临时文件管理
- 重名文件处理
- 磁盘空间检查
- 取消时的清理

3. 错误处理:
- 友好的错误提示
- 错误恢复机制
- 日志记录
- 用户反馈

4. 性能优化:
- 分片处理大文件
- 进度更新节流
- 内存使用监控
- UI渲染优化
