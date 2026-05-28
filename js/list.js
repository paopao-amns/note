/* ============================================================
   list.js — 日记列表
   负责：从 DB 加载日记、按日期分组渲染、卡片交互
   ============================================================ */

var ListPage = (function() {
  "use strict";

  var listContainer, emptyState;
  var currentOffset = 0;
  var pageSize = 30;
  var isLoading = false;

  function cacheDom() {
    listContainer = document.getElementById("entry-list");
    emptyState = document.getElementById("list-empty");
  }

  // 加载日记列表
  function load() {
    if (isLoading) { return; }
    isLoading = true;
    currentOffset = 0;

    DiaryDB.listEntries(0, pageSize).then(function(entries) {
      render(entries);
      isLoading = false;
    }).catch(function(err) {
      console.error("加载日记列表失败:", err);
      isLoading = false;
    });
  }

  // 查看更多
  function loadMore() {
    if (isLoading) { return; }
    isLoading = true;
    currentOffset += pageSize;

    DiaryDB.listEntries(currentOffset, pageSize).then(function(entries) {
      if (entries.length > 0) {
        appendEntries(entries);
      }
      isLoading = false;
    }).catch(function(err) {
      console.error("加载更多失败:", err);
      isLoading = false;
    });
  }

  // 渲染整个列表
  function render(entries) {
    if (!listContainer || !emptyState) { cacheDom(); }

    if (!entries || entries.length === 0) {
      listContainer.innerHTML = "";
      emptyState.style.display = "flex";
      return;
    }

    emptyState.style.display = "none";
    var groups = groupByDate(entries);
    var html = "";

    groups.forEach(function(group) {
      html += '<div class="date-group">';
      html += '<div class="date-group-title">' + group.label + "</div>";
      group.entries.forEach(function(entry) {
        html += renderCard(entry);
      });
      html += "</div>";
    });

    listContainer.innerHTML = html;
  }

  // 追加更多条目
  function appendEntries(entries) {
    if (!listContainer) { cacheDom(); }
    var groups = groupByDate(entries);
    var html = "";
    groups.forEach(function(group) {
      html += '<div class="date-group">';
      html += '<div class="date-group-title">' + group.label + "</div>";
      group.entries.forEach(function(entry) {
        html += renderCard(entry);
      });
      html += "</div>";
    });
    listContainer.insertAdjacentHTML("beforeend", html);
  }

  // 按日期分组
  function groupByDate(entries) {
    var groups = [];
    var today = new Date();
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    entries.forEach(function(entry) {
      var d = new Date(entry.createdAt);
      var label = formatGroupLabel(d, today, yesterday);
      var key = d.toDateString();

      var lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.key === key) {
        lastGroup.entries.push(entry);
      } else {
        groups.push({ key: key, label: label, entries: [entry] });
      }
    });

    return groups;
  }

  function formatGroupLabel(d, today, yesterday) {
    if (d.toDateString() === today.toDateString()) { return "今天"; }
    if (d.toDateString() === yesterday.toDateString()) { return "昨天"; }
    var weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var weekDay = weekDays[d.getDay()];
    return month + "月" + day + "日 " + weekDay;
  }

  // 渲染单张日记卡片
  function renderCard(entry) {
    var title = entry.title || "（无标题）";
    var preview = (entry.content || "").substring(0, 80);
    if (entry.content && entry.content.length > 80) { preview += "..."; }

    var thumbHtml = "";
    if (entry.media && entry.media.length > 0) {
      var firstMedia = entry.media[0];
      if (firstMedia.type === "image" && firstMedia.data) {
        var blob = new Blob([firstMedia.data], { type: "image/jpeg" });
        var thumbUrl = URL.createObjectURL(blob);
        thumbHtml = '<img class="entry-card-thumb" src="' + thumbUrl + '" alt="">';
      }
    }

    var time = formatTime(entry.createdAt);

    return (
      '<div class="entry-card-wrapper">' +
        '<div class="entry-card" data-id="' + entry.id + '">' +
          '<div class="entry-card-body">' +
            '<div class="entry-card-title">' + escapeHtml(title) + "</div>" +
            '<div class="entry-card-preview">' + escapeHtml(preview) + "</div>" +
            '<div class="entry-card-meta">' +
              thumbHtml +
              '<span>' + time + "</span>" +
              (entry.media && entry.media.length > 0 ? '<span>📎' + entry.media.length + "</span>" : "") +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="entry-card-delete-bg">删除</div>' +
      "</div>"
    );
  }

  function formatTime(iso) {
    var d = new Date(iso);
    return String(d.getHours()).padStart(2, "0") + ":" +
           String(d.getMinutes()).padStart(2, "0");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // 从列表中移除一张卡片（带动画）
  function removeCard(id) {
    var card = document.querySelector('.entry-card[data-id="' + id + '"]');
    if (!card) { return; }
    var wrapper = card.parentElement;
    wrapper.style.transition = "opacity 0.2s, transform 0.2s";
    wrapper.style.opacity = "0";
    wrapper.style.transform = "scale(0.9)";
    setTimeout(function() {
      wrapper.remove();
      // 如果列表空了，显示空状态
      if (listContainer.children.length === 0) {
        emptyState.style.display = "flex";
      }
    }, 200);
  }

  // 事件绑定
  function bindEvents() {
    // 点击卡片 → 编辑
    document.addEventListener("click", function(e) {
      var card = e.target.closest(".entry-card");
      if (!card) { return; }
      var id = card.getAttribute("data-id");
      if (id) { Editor.openEdit(id); }
    });

    // 滑动删除逻辑
    var touchStartX = 0;
    var touchCurrentX = 0;
    var activeWrapper = null;

    document.addEventListener("touchstart", function(e) {
      var wrapper = e.target.closest(".entry-card-wrapper");
      if (wrapper) {
        activeWrapper = wrapper;
        touchStartX = e.touches[0].clientX;
      }
    }, { passive: true });

    document.addEventListener("touchmove", function(e) {
      if (!activeWrapper) { return; }
      touchCurrentX = e.touches[0].clientX;
      var dx = touchCurrentX - touchStartX;
      // 只允许向左滑
      var card = activeWrapper.querySelector(".entry-card");
      if (dx < 0) {
        card.style.transform = "translateX(" + Math.max(dx, -80) + "px)";
      }
    }, { passive: true });

    document.addEventListener("touchend", function() {
      if (!activeWrapper) { return; }
      var dx = touchCurrentX - touchStartX;
      var card = activeWrapper.querySelector(".entry-card");
      if (dx < -40) {
        // 滑动超过 40px，保持删除按钮露出
        card.style.transition = "transform 0.2s";
        card.style.transform = "translateX(-80px)";
      } else {
        // 回弹
        card.style.transition = "transform 0.2s";
        card.style.transform = "translateX(0)";
      }
      touchStartX = 0;
      touchCurrentX = 0;
    });

    // 点击删除按钮
    document.addEventListener("click", function(e) {
      if (e.target.classList.contains("entry-card-delete-bg")) {
        var wrapper = e.target.closest(".entry-card-wrapper");
        if (!wrapper) { return; }
        var card = wrapper.querySelector(".entry-card");
        var id = card.getAttribute("data-id");
        if (id) { showDeleteConfirm(id); }
      }
    });

    // 监听保存事件，刷新列表
    window.addEventListener("entry-saved", function() {
      load();
    });
  }

  // 删除确认
  function showDeleteConfirm(id) {
    var confirmOverlay = document.getElementById("confirm-overlay");
    var btnCancel = document.getElementById("confirm-cancel");
    var btnDelete = document.getElementById("confirm-delete");

    confirmOverlay.classList.add("open");

    function cleanup() {
      confirmOverlay.classList.remove("open");
      btnCancel.removeEventListener("click", onCancel);
      btnDelete.removeEventListener("click", onDelete);
    }

    function onCancel() { cleanup(); }

    function onDelete() {
      DiaryDB.deleteEntry(id).then(function() {
        removeCard(id);
        cleanup();
      }).catch(function(err) {
        cleanup();
        alert("删除失败: " + err.message);
      });
    }

    btnCancel.addEventListener("click", onCancel);
    btnDelete.addEventListener("click", onDelete);

    // 点击遮罩关闭
    confirmOverlay.addEventListener("click", function(e) {
      if (e.target === confirmOverlay) { cleanup(); }
    }, { once: true });
  }

  // 初始化
  function init() {
    cacheDom();
    bindEvents();
    load();
  }

  return {
    init: init,
    load: load
  };
})();
