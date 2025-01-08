# 音频切割软件 (Mac版)

基于 Electron 开发的音频切割软件，提供波形可视化界面，支持手动和自动切割音频文件。

## 功能特性

1. 多格式支持
- 支持 MP3/M4A/MP4 格式音频
- 智能格式检测
- 保留原始音频参数

2. 波形可视化
- 高精度波形显示
- 自动分行布局
- 实时播放反馈

3. 智能切割
- 自动检测音频片段
- 阈值和留白可调
- 批量标记生成

4. 精确编辑
- 手动添加标记点
- 拖拽调整位置
- 标记点预览

5. 批量导出
- 自动帧对齐
- 进度实时显示
- 错误自动恢复

## 界面布局

### 1. 顶部工具栏
- 导出功能
  * 导出按钮(支持快捷键)
  * 导出进度显示
  * 导出结果反馈

### 2. 主要内容区
分为左右两栏布局:

#### 左侧内容区
a) 空状态
- 拖拽上传区域
  * 支持文件拖放
  * 支持点击上传
  * 显示上传提示

b) 加载状态
- 播放状态栏
  * 当前播放时间
  * 播放/暂停控制
  * 总时长显示
- 波形显示区域
  * 波形图组成
  * 标记点显示
  * 播放位置指示
- 文件状态栏
  * 文件基本信息
  * 音频参数信息

### 波形图组成

1. 波形条 (Bar)
- 竖直的蓝色线条
- 表示音频振幅大小
- 固定宽度和间距
- 每秒15个采样点

2. 波形行 (Row)
- 包含多个波形条
- 固定高度
- 自动换行排列

3. 播放头 (Playhead)
- 白色竖线
- 指示当前播放位置
- 支持点击定位
- 播放时平滑移动

4. 标记旗 (Mark Flag)
- 绿旗(片段开始)
- 红旗(片段结束)
- 支持拖动调整

5. 波形区域 (Waveform Area)
- 可滚动的波形显示区域
- 包含所有波形元素
- 自定义滚动条样式

#### 右侧控制面板
a) 自动标记功能组
- 阈值设置(0-100%)
- 留白时间设置(0-10s)
- 开始标记按钮

b) 手动标记功能组
- 插入绿旗按钮(开始标记)
- 插入红旗按钮(结束标记)

c) 标记列表
- 标记列表标题
- 清空标记按钮
- 可滚动的标记列表
  * 标记类型图标
  * 时间点显示
  * 删除按钮

### 3. 导出对话框
a) 设置状态
- 文件列表显示
- 导出和取消按钮

b) 处理状态
- 进度条显示
- 当前进度文本
- 取消按钮

c) 结果状态
- 导出结果信息
- 确定按钮

## 基本使用

1. 打开音频文件
- 点击上传或拖拽文件到窗口
- 支持 MP3/M4A/MP4 格式
- 自动显示波形和文件信息

2. 添加标记点
- 自动标记：调整阈值和留白，点击"开始标记"
- 手动标记：使用绿旗/红旗按钮或键盘快捷键
- 拖动标记：直接拖动标记点调整位置

3. 导出音频片段
- 点击顶部导出按钮
- 确认导出文件列表
- 等待处理完成

## Mac原生体验
- 原生窗口样式
- 系统菜单集成
- 本地化支持
- 高分屏适配

> 查看[技术开发记录](tech.md)了解详细的开发进度和技术细节。
