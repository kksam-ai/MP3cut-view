# 错误日式

## 软件界面错误提示
处理文件时出错: Invalid argument, please consider using the load helper


## 控制台日志
Electron Security Warning (Insecure Content-Security-Policy) This renderer process has either no Content Security
  Policy set or a policy with "unsafe-eval" enabled. This exposes users of
  this app to unnecessary security risks.

For more information and help, consult
https://electronjs.org/docs/tutorial/security.
This warning will not show up
once the app is packaged.


## 服务器日志
npm run watch

> audio-cutter@1.0.0 watch
> nodemon --watch src/main --exec electron .

[nodemon] 2.0.22
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): src/main/**/*
[nodemon] watching extensions: js,mjs,json
[nodemon] starting `electron .`
2024-12-24 22:28:10.372 Electron[94445:2852428] +[IMKClient subclass]: chose IMKClient_Modern
2024-12-24 22:28:10.372 Electron[94445:2852428] +[IMKInputSession subclass]: chose IMKInputSession_Modern
2024-12-24 22:29:32.201 Electron[94445:2852428] The class 'NSOpenPanel' overrides the method identifier.  This method is implemented by class 'NSWindow'
[nodemon] restarting due to changes...
[nodemon] starting `electron .`
2024-12-24 22:30:59.441 Electron[94744:2855711] +[IMKClient subclass]: chose IMKClient_Modern
2024-12-24 22:30:59.441 Electron[94744:2855711] +[IMKInputSession subclass]: chose IMKInputSession_Modern
2024-12-24 22:31:01.924 Electron[94744:2855711] The class 'NSOpenPanel' overrides the method identifier.  This method is implemented by class 'NSWindow'
Processing audio file: /Users/kks/Downloads/Lesson2/Lesson2.mp3
Temp file path: /var/folders/5w/16_pt_q50nq83wcp172_snjm0000gn/T/temp_audio_1735050664429.wav
FFmpeg command: ffmpeg -i /Users/kks/Downloads/Lesson2/Lesson2.mp3 -y -f wav /var/folders/5w/16_pt_q50nq83wcp172_snjm0000gn/T/temp_audio_1735050664429.wav
FFmpeg conversion completed
Temp file read, size: 18085966
Error in end handler: Error: Invalid argument, please consider using the load helper
    at AudioContext.decodeAudioData (/Users/kks/Projects/MP3cut/node_modules/node-web-audio-api/monkey-patch.js:94:15)
    at FfmpegCommand.<anonymous> (/Users/kks/Projects/MP3cut/src/main/audio-processor.js:79:57)
Error processing audio: Error: Invalid argument, please consider using the load helper
    at AudioContext.decodeAudioData (/Users/kks/Projects/MP3cut/node_modules/node-web-audio-api/monkey-patch.js:94:15)
    at FfmpegCommand.<anonymous> (/Users/kks/Projects/MP3cut/src/main/audio-processor.js:79:57)
