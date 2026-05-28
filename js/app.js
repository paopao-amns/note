/* ============================================================
   app.js — 主控制器
   负责：Service Worker 注册、Tab 切换、模块初始化
   阶段 2 将填充完整逻辑
   ============================================================ */

// Service Worker 注册（生产环境）
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("/note/sw.js").catch(function() {
      // 开发环境（本地文件打开）注册失败是正常的
    });
  });
}

// Tab 切换
document.addEventListener("DOMContentLoaded", function() {
  var tabBtns = document.querySelectorAll(".tab-btn");
  var pages = document.querySelectorAll(".page");
  var titleEl = document.querySelector(".top-bar-title");

  tabBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      var page = this.getAttribute("data-page");

      // 切换激活的 Tab
      tabBtns.forEach(function(b) { b.classList.remove("active"); });
      this.classList.add("active");

      // 切换页面
      pages.forEach(function(p) { p.classList.remove("active"); });
      var target = document.getElementById("page-" + page);
      if (target) { target.classList.add("active"); }

      // 更新标题
      var titles = { list: "我的日记", calendar: "日历", search: "搜索" };
      if (titleEl) { titleEl.textContent = titles[page] || "我的日记"; }
    });
  });

  // 悬浮按钮点击（阶段 2 实现编辑器打开逻辑）
  var fab = document.getElementById("fab-new");
  if (fab) {
    fab.addEventListener("click", function() {
      // 阶段 2 实现
    });
  }
});
