const { getValidSegments, formatTime } = require('./mark-validator');

// 测试用例
function runTests() {
  console.log('开始测试标记验证模块...\n');

  // 测试1: 空标记列表
  console.log('测试1: 空标记列表');
  const result1 = getValidSegments([], 100);
  console.log('结果:', result1);
  console.log('预期: 空数组');
  console.log('通过:', result1.length === 0, '\n');

  // 测试2: 单个有效标记对
  console.log('测试2: 单个有效标记对');
  const marks2 = [
    { type: 'start', time: 10 },
    { type: 'end', time: 15 }
  ];
  const result2 = getValidSegments(marks2, 100);
  console.log('结果:', result2);
  console.log('预期: 一个片段，时长5秒');
  console.log('通过:', result2.length === 1 && result2[0].duration === 5, '\n');

  // 测试3: 多个有效标记对
  console.log('测试3: 多个有效标记对');
  const marks3 = [
    { type: 'start', time: 10 },
    { type: 'end', time: 15 },
    { type: 'start', time: 20 },
    { type: 'end', time: 25 }
  ];
  const result3 = getValidSegments(marks3, 100);
  console.log('结果:', result3);
  console.log('预期: 两个片段');
  console.log('通过:', result3.length === 2, '\n');

  // 测试4: 间隔不足的标记对
  console.log('测试4: 间隔不足的标记对');
  const marks4 = [
    { type: 'start', time: 10 },
    { type: 'end', time: 10.5 }
  ];
  const result4 = getValidSegments(marks4, 100);
  console.log('结果:', result4);
  console.log('预期: 空数组(间隔小于1秒)');
  console.log('通过:', result4.length === 0, '\n');

  // 测试5: 超出范围的标记
  console.log('测试5: 超出范围的标记');
  const marks5 = [
    { type: 'start', time: -1 },
    { type: 'end', time: 5 },
    { type: 'start', time: 95 },
    { type: 'end', time: 105 }
  ];
  const result5 = getValidSegments(marks5, 100);
  console.log('结果:', result5);
  console.log('预期: 空数组(标记超出范围)');
  console.log('通过:', result5.length === 0, '\n');

  // 测试6: 乱序标记
  console.log('测试6: 乱序标记');
  const marks6 = [
    { type: 'end', time: 15 },
    { type: 'start', time: 10 },
    { type: 'end', time: 25 },
    { type: 'start', time: 20 }
  ];
  const result6 = getValidSegments(marks6, 100);
  console.log('结果:', result6);
  console.log('预期: 两个片段(应该自动排序)');
  console.log('通过:', result6.length === 2, '\n');

  // 测试7: 时间格式化
  console.log('测试7: 时间格式化');
  const time1 = formatTime(3661.5); // 1小时1分1秒50厘秒
  console.log('结果:', time1);
  console.log('预期: 01:01:01:50');
  console.log('通过:', time1 === '01:01:01:50', '\n');

  console.log('测试完成!');
}

// 运行测试
runTests();
