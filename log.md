# 错误日式

## 软件界面错误提示
无


## 控制台日志
node:electron/js2c/renderer_init:2 Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.
warnAboutInsecureCSP @ node:electron/js2c/renderer_init:2
logSecurityWarnings @ node:electron/js2c/renderer_init:2
（匿名） @ node:electron/js2c/renderer_init:2
load（异步）
securityWarnings @ node:electron/js2c/renderer_init:2
./lib/renderer/common-init.ts @ node:electron/js2c/renderer_init:2
__webpack_require__ @ node:electron/js2c/renderer_init:2
（匿名） @ node:electron/js2c/renderer_init:2
（匿名） @ node:electron/js2c/renderer_init:2
___electron_webpack_init__ @ node:electron/js2c/renderer_init:2
（匿名） @ node:electron/js2c/renderer_init:2
compileForInternalLoader @ node:internal/bootstrap/loaders:334
compileForPublicLoader @ node:internal/bootstrap/loaders:270
loadBuiltinModule @ node:internal/modules/cjs/helpers:56
Module._load @ node:internal/modules/cjs/loader:941
f._load @ node:electron/js2c/asar_bundle:2
executeUserEntryPoint @ node:internal/modules/run_main:96
（匿名） @ node:internal/main/run_main_module:23
// 1. 创建测试数据
const testContent = new Uint8Array(1024);
testContent.fill(1);
const testFile = new File([testContent], 'test.mp3', {
  type: 'audio/mp3',
  lastModified: Date.now()
});

const testAudioData = {
  sampleRate: 44100,
  duration: 120,
  numberOfChannels: 2,
  waveform: new Float32Array(100).fill(0.5),
  bitRate: 320000,
  format: 'mp3',
  codec: 'mp3',
  tags: {
    title: 'Test Song'
  }
};

// 2. 创建元数据对象
const metadata = createAudioMetadata(testFile, testAudioData);

// 3. 测试顶层对象不可变性
console.log('测试 1: 尝试修改顶层对象');
const preTest1 = {...metadata};
try {
  metadata.newProperty = 'test';
  console.log('修改前:', preTest1);
  console.log('修改后:', metadata);
  console.log('属性是否被添加:', 'newProperty' in metadata);
  console.log(Object.isFrozen(metadata) ? '✅ 对象已冻结' : '❌ 对象未冻结');
} catch (e) {
  console.log('✅ 通过: 无法添加新属性 -', e.message);
}

// 4. 测试嵌套对象不可变性
console.log('\n测试 2: 尝试修改 fileMetadata');
const originalName = metadata.fileMetadata.name;
try {
  metadata.fileMetadata.name = 'new name';
  console.log('原始名称:', originalName);
  console.log('当前名称:', metadata.fileMetadata.name);
  console.log('名称是否改变:', originalName !== metadata.fileMetadata.name);
  console.log(Object.isFrozen(metadata.fileMetadata) ? '✅ 对象已冻结' : '❌ 对象未冻结');
} catch (e) {
  console.log('✅ 通过: 无法修改嵌套对象 -', e.message);
}

// 5. 测试深层对象不可变性
console.log('\n测试 3: 尝试修改 tags');
const originalTitle = metadata.tags.title;
try {
  metadata.tags.title = 'new title';
  console.log('原始标题:', originalTitle);
  console.log('当前标题:', metadata.tags.title);
  console.log('标题是否改变:', originalTitle !== metadata.tags.title);
  console.log(Object.isFrozen(metadata.tags) ? '✅ 对象已冻结' : '❌ 对象未冻结');
} catch (e) {
  console.log('✅ 通过: 无法修改深层对象 -', e.message);
}

// 6. 详细的冻结状态检查
console.log('\n详细的冻结状态检查:');
function checkFrozenStatus(obj, path = '') {
  if (obj && typeof obj === 'object') {
    console.log(`${path || 'root'}: ${Object.isFrozen(obj) ? '✅ 已冻结' : '❌ 未冻结'}`);
    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        checkFrozenStatus(value, path ? `${path}.${key}` : key);
      }
    });
  }
}

checkFrozenStatus(metadata);
VM868:26 测试 1: 尝试修改顶层对象
VM868:30 修改前: {fileMetadata: {…}, audioParams: {…}, tags: {…}}
VM868:31 修改后: {fileMetadata: {…}, audioParams: {…}, tags: {…}}
VM868:32 属性是否被添加: false
VM868:33 ✅ 对象已冻结
VM868:39
测试 2: 尝试修改 fileMetadata
VM868:43 原始名称: test.mp3
VM868:44 当前名称: test.mp3
VM868:45 名称是否改变: false
VM868:46 ✅ 对象已冻结
VM868:52
测试 3: 尝试修改 tags
VM868:56 原始标题: Test Song
VM868:57 当前标题: Test Song
VM868:58 标题是否改变: false
VM868:59 ✅ 对象已冻结
VM868:65
详细的冻结状态检查:
VM868:68 root: ✅ 已冻结
VM868:68 fileMetadata: ✅ 已冻结
VM868:68 fileMetadata.lastModified: ✅ 已冻结
VM868:68 audioParams: ✅ 已冻结
VM868:68 tags: ✅ 已冻结
undefined


## 服务器日志
无
