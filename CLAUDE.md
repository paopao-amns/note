# CLAUDE.md — 日记 PWA 项目 AI 工作指引

## 项目概述

为 iOS 15+ 开发的日记 PWA 应用，类似 iOS 17「手记」功能。纯 HTML/CSS/JS，通过 GitHub Pages 部署，iPhone Safari "添加到主屏幕" 安装。

## 目录结构

```
note/
├── CLAUDE.md               # 本文件，AI 工作指引
├── index.html              # 主入口，单页应用全部 DOM 结构
├── sw.js                   # Service Worker，离线缓存
├── manifest.json           # PWA 配置（图标、名称、全屏模式）
├── css/
│   └── style.css           # 全局样式
├── js/
│   ├── app.js              # 主控制器（路由、Tab切换、初始化）
│   ├── db.js               # IndexedDB 数据层（Dexie.js 封装）
│   ├── editor.js           # 日记编辑器（文本+媒体+保存）
│   ├── list.js             # 日记列表页
│   ├── calendar.js         # 日历页
│   └── search.js           # 搜索页
├── assets/
│   └── icon.svg            # App 图标 192x192
├── docs/                   # 项目规范文档
│   ├── 01-需求规格.md
│   ├── 02-技术方案.md
│   ├── 03-UI设计规范.md
│   └── 04-执行步骤.md
└── devlog/                 # 开发日志，按日期记录
    └── YYYY-MM-DD.md
```

## 工作流

1. **开工前**：读取 `devlog/` 中最新的日志文件，了解当前进度和待办
2. **开发中**：按 `docs/04-执行步骤.md` 中当前阶段执行
3. **收工前**：更新今日 `devlog/YYYY-MM-DD.md`，记录完成/待办/问题

## 技术要点

- **零依赖原则**：除 Dexie.js（CDN 引入用于 IndexedDB 简化）外不引入任何框架
- **iOS 兼容**：所有功能必须在 iOS 15 Safari 上测试通过
- **PWA 离线**：Service Worker 使用 Cache-First 策略
- **存储**：Dexie.js 操作 IndexedDB，媒体以 ArrayBuffer 存储

## 用户背景

- 编程小白，由 AI 代为编写全部代码
- Windows 电脑，无 Mac
- 仅 iPhone + 免费 Apple ID
- 零预算
