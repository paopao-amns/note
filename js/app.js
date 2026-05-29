/* ============================================================
   app.js — 主控制器
   负责：初始化、路由/Tab切换、编辑器页面导航、Service Worker
   ============================================================ */

var App = (function() {
  "use strict";

  var tabBtns, pages, titleEl, tabBar;

  // Service Worker 注册
  function registerSW() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function() {
        navigator.serviceWorker.register("/note/sw.js").then(function(reg) {
          console.log("SW registered:", reg.scope);
        }).catch(function(err) {
          console.log("SW registration failed:", err.message);
        });
      });
    }
  }

  // 查询当前激活的页面
  function currentPage() {
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].classList.contains("active")) {
        var id = pages[i].id;
        if (id === "page-list") { return "list"; }
        if (id === "page-calendar") { return "calendar"; }
        if (id === "page-search") { return "search"; }
      }
    }
    return "list";
  }

  // Tab / 页面切换（对外暴露，editor 关闭时会调用）
  function switchTab(pageName) {
    // 隐藏编辑器页面
    var editorPage = document.getElementById("page-editor");
    if (editorPage) { editorPage.classList.remove("active"); }

    // 恢复 tab 栏和 FAB
    if (tabBar) { tabBar.style.display = ""; }
    var fab = document.getElementById("fab-new");
    if (fab) { fab.style.display = ""; }

    // 更新 Tab 按钮状态
    tabBtns.forEach(function(btn) {
      var p = btn.getAttribute("data-page");
      btn.classList.toggle("active", p === pageName);
    });

    // 只显示目标页面
    pages.forEach(function(p) { p.classList.remove("active"); });
    var target = document.getElementById("page-" + pageName);
    if (target) { target.classList.add("active"); }

    // 更新标题
    var titles = { list: "我的日记", calendar: "日历", search: "搜索" };
    if (titleEl) { titleEl.textContent = titles[pageName] || "我的日记"; }

    document.body.style.overflow = "";

    // 刷新对应页面数据
    if (pageName === "list" && typeof ListPage !== "undefined") { ListPage.load(); }
    if (pageName === "calendar" && typeof CalendarPage !== "undefined") { CalendarPage.render(); }
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

    // FAB 新建按钮
    var fab = document.getElementById("fab-new");
    if (fab) {
      fab.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (typeof Editor !== "undefined") {
            Editor.openNew(currentPage());
          }
        } catch (err) {
          window.alert("打开编辑器失败: " + err.message);
        }
      });

      fab.addEventListener("touchend", function(e) {
        e.preventDefault();
        fab.click();
      });
    }

    // 设置按钮 → 打开导出/导入菜单
    document.addEventListener("click", function(e) {
      if (e.target.id === "btn-settings") {
        document.getElementById("action-overlay").classList.add("open");
      }
    });

    // 关闭操作菜单
    document.addEventListener("click", function(e) {
      if (e.target.id === "action-overlay" || e.target.id === "btn-action-cancel") {
        document.getElementById("action-overlay").classList.remove("open");
      }
    });

    // 导出 JSON
    document.addEventListener("click", function(e) {
      if (e.target.id !== "btn-export-json") { return; }
      document.getElementById("action-overlay").classList.remove("open");
      DiaryDB.exportJSON().then(function(count) {
        window.alert("已导出 " + count + " 篇日记（JSON 格式）");
      }).catch(function(err) {
        window.alert("导出失败: " + err.message);
      });
    });

    // 导出 HTML
    document.addEventListener("click", function(e) {
      if (e.target.id !== "btn-export-html") { return; }
      document.getElementById("action-overlay").classList.remove("open");
      DiaryDB.exportHTML().then(function(count) {
        window.alert("已导出 " + count + " 篇日记（HTML 格式）");
      }).catch(function(err) {
        window.alert("导出失败: " + err.message);
      });
    });

    // 导入 JSON
    document.addEventListener("click", function(e) {
      if (e.target.id !== "btn-import-json") { return; }
      var fileInput = document.getElementById("file-import");
      if (fileInput) { fileInput.click(); }
      document.getElementById("action-overlay").classList.remove("open");
    });

    document.addEventListener("change", function(e) {
      if (e.target.id !== "file-import") { return; }
      var file = e.target.files[0];
      if (!file) { return; }
      var reader = new FileReader();
      reader.onload = function(ev) {
        DiaryDB.importJSON(ev.target.result).then(function(count) {
          window.alert("已导入 " + count + " 篇日记！");
          if (typeof ListPage !== "undefined") { ListPage.load(); }
          if (typeof CalendarPage !== "undefined") { CalendarPage.render(); }
        }).catch(function(err) {
          window.alert("导入失败: " + err.message);
        });
      };
      reader.readAsText(file);
      e.target.value = "";
    });

    // 照片灯箱关闭
    document.addEventListener("click", function(e) {
      if (e.target.id === "lightbox-close" || e.target.id === "lightbox") {
        document.getElementById("lightbox").classList.remove("open");
      }
    });

    // 点击缩略图放大查看
    document.addEventListener("click", function(e) {
      var thumb = e.target.closest(".entry-card-thumb");
      if (!thumb) { return; }
      e.stopPropagation();
      var lightbox = document.getElementById("lightbox");
      var lightboxImg = document.getElementById("lightbox-img");
      lightboxImg.src = thumb.src;
      lightbox.classList.add("open");
    });

    // 列表页滚动加载更多
    var listContent = document.getElementById("list-content");
    if (listContent) {
      listContent.addEventListener("scroll", function() {
        var scrollBottom = listContent.scrollHeight - listContent.scrollTop - listContent.clientHeight;
        if (scrollBottom < 200 && typeof ListPage !== "undefined") {
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
    tabBar = document.querySelector(".tab-bar");

    registerSW();
    bindEvents();

    // 初始化各模块
    if (typeof Editor !== "undefined") { Editor.init(); }
    if (typeof ListPage !== "undefined") { ListPage.init(); }
    if (typeof CalendarPage !== "undefined") { CalendarPage.init(); }
    if (typeof SearchPage !== "undefined") { SearchPage.init(); }
  }

  // DOM 就绪后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    switchTab: switchTab,
    currentPage: currentPage
  };
})();
