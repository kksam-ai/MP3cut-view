# 音频切割软件 (Mac版)

基于Electron框架开发的音频切割软件,支持波形可视化和自动切割。

> 查看[技术开发记录](tech.md)了解详细的开发进度和技术细节。

## 技术栈

- Electron
- Web Audio API
- Node.js
- Canvas

## 开发阶段

### 第一阶段: 基础框架 (预计2周)

开发目标:
- 实现基本的应用框架
- 完成核心的音频处理功能
- 建立基础界面

功能列表:
1. 文件操作
   - 支持打开 M4a/mp3/MP4 格式
   - 支持拖拽文件
   - 显示文件基本信息

2. 波形显示
   - 完整音频波形图
   - 波形数据计算
   - 基本光标导航

3. 播放控制
   - 播放/暂停
   - 进度控制

验收标准:
- [x] 能够正确打开支持的音频格式
- [x] 准确显示音频波形
- [x] 可以正常播放和控制音频
- [x] 界面响应流畅,无明显卡顿

### 已实现的功能

1. 文件操作
   - 支持 MP3/M4A/MP4 格式
   - 支持拖拽和点击上传
   - 文件格式验证
   - 错误处理优化

2. 波形显示
   - 实时波形计算
   - 多行自动换行布局
   - 高分辨率屏幕适配
   - 播放进度指示
   - 点击定位功能

3. 播放控制
   - 播放/暂停切换
   - 进度同步显示
   - 空格键快捷控制
   - 播放位置记忆

4. 性能优化
   - 波形采样算法优化
   - Canvas 渲染性能优化
   - 内存使用优化
   - 临时文件管理

5. 元数据管理
   - 统一的元数据结构
   - 数据不可变性保证
   - 完整的错误处理
   - 性能优化实现
     * 对象冻结优化
     * 验证优化
     * 对象创建优化
     * 错误处理优化
     - 统一的时间格式化
     - 清晰的数据职责划分
     - 保证数据一致性

### 第二阶段: 核心功能 (预计3周)

开发目标:
- 实现音频切割核心功能
- 完善波形交互
- 建立标记系统

功能列表:
1. 标记系统
   - [x] 手动添加起始/结束标记
   - [x] 标记拖拽调整
   - [x] 标记删除
   - [x] 标记数据管理

2. 自动切割
   - [x] 阈值设置界面
   - [x] 留白时间设置
   - [x] 自动检测算法
   - [x] 批量生成标记

3. 试听功能
   - [ ] 选段播放
   - [ ] 标记区间播放
   - [ ] 播放时波形同步

验收标准:
- [x] 手动标记操作准确,响应及时
- [x] 自动检测算法准确率达到80%以上
- [x] 标记可以正确保存和加载
- [ ] 试听功能正确对应标记区间

### 第三阶段: 功能完善 (预计2周)

开发目标:
- 优化用户体验
- 添加辅助功能
- 提升运行效率

功能列表:
1. 波形导航
   - 波形缩放
   - 快速定位
   - 刷新率控制

2. 高级播放
   - 循环播放
   - 跳跃播放
   - 播放速度控制

3. 批量导出
   - 文件名规则设置
   - 序号自动递增
   - 导出进度显示
   - 切割数据保存

验收标准:
- [ ] 波形缩放流畅,不影响性能
- [ ] 所有播放模式正常工作
- [ ] 批量导出准确且效率高
- [ ] 内存占用合理,无内存泄漏

## 项目依赖

- electron: ^25.0.0
- @electron/remote: ^2.0.10
- ffmpeg-static: ^5.1.0
- fluent-ffmpeg: ^2.1.2
- node-web-audio-api: ^0.10.0

## 开发环境

- Node.js >= 16
- npm >= 8
- MacOS >= 10.15

## 构建和运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建应用
npm run build
```

## 测试规范

1. 单元测试
   - 核心算法测试
   - 文件操作测试
   - 数据处理测试

2. 功能测试
   - 界面操作测试
   - 音频处理测试
   - 导出功能测试

3. 性能测试
   - 内存占用测试
   - 大文件处理测试
   - 批量导出测试

## 界面需求

### 1. 顶部操作区
- 文件操作
  * 打开文件按钮
- 播放控制
  * 播放/暂停按钮
- 标记操作
  * 创建标记
  * 删除标记
  * 移动标记
- 导出功能
  * 基于标记位置切割音频
  * 导出为多个 mp3 文件

### 2. 主要区域
- 空文件状态
  * 显示拖拽上传提示
  * 支持点击上传
- 文件加载状态
  * 显示音频波形
  * 波形自动换行显示（根据窗口宽度）
  * 支持标记的可视化
  * 当前播放位置指示

### 3. 底部状态栏
- 显示文件信息
  * 文件名
  * 文件大小
  * 音频时长
  * 音频格式
  * 采样率等技术参数

## 功能特性

- 支持 MP3/M4A/MP4 格式音频
- 波形可视化
- 精确的音频切割
- 批量导出功能
