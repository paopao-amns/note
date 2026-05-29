# 我的日记 📝

一款类 iOS 17「手记」的日记 PWA 应用。纯网页实现，无需安装，添加到 iPhone 主屏幕即可使用。

## 功能

- **写日记** — 标题 + 正文，全屏沉浸式编辑
- **图片 / 视频** — 支持拍照、从相册选取、录像
- **日历视图** — 按月浏览，有日记的日期自动标记
- **全文搜索** — 输入关键词实时查找，高亮匹配内容
- **离线可用** — 断网也能看日记、写日记
- **滑动删除** — 左滑卡片快速删除

## 使用方式

### iPhone / iPad

1. Safari 打开 https://paopao-amns.github.io/note/
2. 点底部「分享」按钮 → **添加到主屏幕**
3. 主屏幕出现「我的日记」图标，点击即可使用

### 电脑

直接用浏览器打开上述网址即可，推荐 Chrome / Edge。

## 技术栈

- 纯 HTML / CSS / JavaScript，零框架
- IndexedDB 本地存储（Dexie.js）
- Service Worker 离线缓存
- GitHub Pages 免费部署

## 项目结构

```
note/
├── index.html          # 主页面
├── manifest.json       # PWA 配置
├── sw.js               # Service Worker
├── css/style.css       # 样式
├── js/
│   ├── app.js          # 主控制器
│   ├── db.js           # 数据层
│   ├── editor.js       # 日记编辑器
│   ├── list.js         # 日记列表
│   ├── calendar.js     # 日历页
│   └── search.js       # 搜索页
├── assets/icon.svg     # App 图标
├── docs/               # 需求 & 技术文档
└── devlog/             # 开发日志
```

## 数据安全

所有日记数据存储在手机本地（IndexedDB），不上传任何服务器。清除 Safari 网站数据会导致日记丢失，请注意备份。
