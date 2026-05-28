/* ============================================================
   app.js — 主控制器
   负责：初始化、路由/Tab切换、Service Worker注册
   ============================================================ */

(function() {
  "use strict";

  var tabBtns;
  var pages;
  var titleEl;
  var fabBtn;

  // Service Worker 注册
  function registerSW() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function() {
        navigator.serviceWorker.register("/note/sw.js").then(function(reg) {
          console.log("SW registered:", reg.scope);
        }).catch(function(err) {
          console.log("SW registration failed (本地文件打开会失败，正常):", err.message);
        });
      });
    }
  }

  // Tab 切换
  function switchTab(pageName) {
    // 更新 Tab 按钮状态
    tabBtns.forEach(function(btn) {
      var p = btn.getAttribute("data-page");
      if (p === pageName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // 更新页面显示
    pages.forEach(function(p) { p.classList.remove("active"); });
    var target = document.getElementById("page-" + pageName);
    if (target) { target.classList.add("active"); }

    // 更新标题
    var titles = { list: "我的日记", calendar: "日历", search: "搜索" };
    if (titleEl) { titleEl.textContent = titles[pageName] || "我的日记"; }

    // 切换到列表页时刷新数据
    if (pageName === "list") { ListPage.load(); }
  }

  // 事件绑定
  function bindEvents() {
    // Tab 按钮点击
    document.addEventListener("click", function(e) {
      var btn = e.target.closest(".tab-btn");
      if (!btn) { return; }
      var page = btn.getAttribute("data-page");
      if (page) { switchTab(page); }
    });

    // FAB 新建按钮（直接绑定，避免 closest 兼容性问题）
    var fab = document.getElementById("fab-new");
    if (fab) {
      fab.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (typeof Editor !== "undefined") {
            Editor.openNew();
          }
        } catch (err) {
          alert("打开编辑器失败: " + err.message);
        }
      });
      // 同时监听 touchstart 提升响应速度
      fab.addEventListener("touchend", function(e) {
        e.preventDefault();
        fab.click();
      });
    }

    // 照片灯箱关闭
    document.addEventListener("click", function(e) {
      if (e.target.id === "lightbox-close" || e.target.id === "lightbox") {
        document.getElementById("lightbox").classList.remove("open");
      }
    });

    // 照片灯箱——点击列表中的缩略图放大查看
    document.addEventListener("click", function(e) {
      var thumb = e.target.closest(".entry-card-thumb");
      if (!thumb) { return; }
      e.stopPropagation(); // 阻止触发卡片编辑
      var lightbox = document.getElementById("lightbox");
      var lightboxImg = document.getElementById("lightbox-img");
      lightboxImg.src = thumb.src;
      lightbox.classList.add("open");
    });

    // 列表页滚动到底部加载更多
    var listContent = document.getElementById("list-content");
    if (listContent) {
      listContent.addEventListener("scroll", function() {
        var scrollBottom = listContent.scrollHeight - listContent.scrollTop - listContent.clientHeight;
        if (scrollBottom < 200) {
          ListPage.loadMore();
        }
      }, { passive: true });
    }
  }

  // 初始化
  function init() {
    tabBtns = document.querySelectorAll(".tab-btn");
    pages = document.querySelectorAll(".page");
    titleEl = document.querySelector(".top-bar-title");
    fabBtn = document.getElementById("fab-new");

    registerSW();
    bindEvents();

    // 初始化各模块
    if (typeof Editor !== "undefined") { Editor.init(); }
    if (typeof ListPage !== "undefined") { ListPage.init(); }
  }

  // DOM 就绪后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
