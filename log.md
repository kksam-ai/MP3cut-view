# 错误日式

## 软件界面错误提示
无


## 控制台日志
无

## 服务器日志
无


## 终端日志
node src/renderer/test-mark-validator.js
开始测试标记验证模块...

测试1: 空标记列表
结果: []
预期: 空数组
通过: true

测试2: 单个有效标记对
结果: [ { startTime: 10, endTime: 15, duration: 5, index: 1 } ]
预期: 一个片段，时长5秒
通过: true

测试3: 多个有效标记对
结果: [
  { startTime: 10, endTime: 15, duration: 5, index: 1 },
  { startTime: 20, endTime: 25, duration: 5, index: 2 }
]
预期: 两个片段
通过: true

测试4: 间隔不足的标记对
结果: []
预期: 空数组(间隔小于1秒)
通过: true

测试5: 超出范围的标记
结果: []
预期: 空数组(标记超出范围)
通过: true

测试6: 乱序标记
结果: [
  { startTime: 10, endTime: 15, duration: 5, index: 1 },
  { startTime: 20, endTime: 25, duration: 5, index: 2 }
]
预期: 两个片段(应该自动排序)
通过: true

测试7: 时间格式化
结果: 01:01:01:50
预期: 01:01:01:50
通过: true

测试完成!
