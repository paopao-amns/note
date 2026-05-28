/* ============================================================
   calendar.js — 日历视图
   负责：月历渲染、月份切换、日期打点、选中日期的日记列表
   ============================================================ */

var CalendarPage = (function() {
  "use strict";

  var currentYear, currentMonth;  // 当前显示的月份 (1-12)
  var selectedDate;              // 选中的日期 "YYYY-MM-DD"
  var dateGrid, monthLabel, selectedLabel, dateEntriesList;

  function cacheDom() {
    dateGrid = document.getElementById("date-grid");
    monthLabel = document.getElementById("month-label");
    selectedLabel = document.getElementById("selected-date-label");
    dateEntriesList = document.getElementById("date-entries-list");
  }

  // 初始化，加载当月
  function init() {
    cacheDom();
    var today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth() + 1;
    selectedDate = null;
    render();
  }

  // 切换到上个月
  function prevMonth() {
    if (currentMonth === 1) {
      currentMonth = 12;
      currentYear--;
    } else {
      currentMonth--;
    }
    render();
  }

  // 切换到下个月
  function nextMonth() {
    if (currentMonth === 12) {
      currentMonth = 1;
      currentYear++;
    } else {
      currentMonth++;
    }
    render();
  }

  // 渲染整个日历
  function render() {
    if (!dateGrid) { cacheDom(); }
    if (!dateGrid) { return; }

    monthLabel.textContent = currentYear + "年" + currentMonth + "月";

    DiaryDB.getDatesWithEntries().then(function(dateMap) {
      dateGrid.innerHTML = "";
      var today = new Date();
      var todayKey = today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

      // 本月第一天是星期几 (0=日, 1=一, ...)
      var firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
      // 转换为周一=0
      firstDay = firstDay === 0 ? 6 : firstDay - 1;

      // 本月天数
      var daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      // 填充上月末尾日期
      var prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();
      for (var i = firstDay - 1; i >= 0; i--) {
        var d = prevMonthDays - i;
        dateGrid.appendChild(createCell(d, true, null, null));
      }

      // 填充本月日期
      for (var d2 = 1; d2 <= daysInMonth; d2++) {
        var key = currentYear + "-" +
          String(currentMonth).padStart(2, "0") + "-" +
          String(d2).padStart(2, "0");
        var hasEntry = dateMap[key] || false;
        var isToday = (key === todayKey);
        var isSelected = (key === selectedDate);
        dateGrid.appendChild(createCell(d2, false, hasEntry, key, isToday, isSelected));
      }

      // 填充下月开头
      var remaining = 42 - (firstDay + daysInMonth); // 6 rows * 7 cols
      if (remaining > 0) {
        for (var d3 = 1; d3 <= remaining; d3++) {
          dateGrid.appendChild(createCell(d3, true, null, null));
        }
      }
    });
  }

  // 创建单个日期格子
  function createCell(day, isOtherMonth, hasEntry, dateKey, isToday, isSelected) {
    var cell = document.createElement("div");
    cell.className = "date-cell";

    if (isOtherMonth) {
      cell.classList.add("other-month");
    } else {
      cell.setAttribute("data-date", dateKey);
    }

    if (isToday && !isOtherMonth) {
      cell.classList.add("today");
    }

    if (isSelected && !isOtherMonth) {
      cell.classList.add("selected");
    }

    cell.textContent = day;

    if (hasEntry && !isOtherMonth) {
      var dot = document.createElement("span");
      dot.className = "date-dot";
      cell.appendChild(dot);
    }

    return cell;
  }

  // 点击日期，显示该日日记
  function selectDate(dateKey) {
    if (!dateEntriesList) { cacheDom(); }
    if (!dateKey) { return; }

    selectedDate = dateKey;
    render(); // 重新渲染高亮

    var parts = dateKey.split("-");
    var y = parseInt(parts[0]);
    var m = parseInt(parts[1]);
    var d = parseInt(parts[2]);

    selectedLabel.textContent = m + "月" + d + "日 的日记";

    DiaryDB.listByDate(y, m, d).then(function(entries) {
      if (entries.length === 0) {
        dateEntriesList.innerHTML = '<p style="color:var(--text-sub);font-size:14px;padding:12px 0;">这天没有日记</p>';
        return;
      }

      var html = "";
      entries.forEach(function(entry) {
        html += renderEntryCard(entry);
      });
      dateEntriesList.innerHTML = html;
    });
  }

  // 渲染日期下的日记卡片（复用列表样式）
  function renderEntryCard(entry) {
    var title = entry.title || "（无标题）";
    var preview = (entry.content || "").substring(0, 60);
    if (entry.content && entry.content.length > 60) { preview += "..."; }

    var thumbHtml = "";
    if (entry.media && entry.media.length > 0 && entry.media[0].type === "image" && entry.media[0].data) {
      var blob = new Blob([entry.media[0].data], { type: "image/jpeg" });
      var url = URL.createObjectURL(blob);
      thumbHtml = '<img class="entry-card-thumb" src="' + url + '" alt="">';
    }

    var time = formatTime(entry.createdAt);

    return (
      '<div class="entry-card" data-id="' + entry.id + '" style="margin-bottom:10px;">' +
        '<div class="entry-card-body">' +
          '<div class="entry-card-title">' + escHtml(title) + "</div>" +
          '<div class="entry-card-preview">' + escHtml(preview) + "</div>" +
          '<div class="entry-card-meta">' + thumbHtml + "<span>" + time + "</span></div>" +
        "</div>" +
      "</div>"
    );
  }

  function formatTime(iso) {
    var d = new Date(iso);
    return String(d.getHours()).padStart(2, "0") + ":" +
           String(d.getMinutes()).padStart(2, "0");
  }

  function escHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // 事件绑定
  function bindEvents() {
    // 上月按钮
    document.addEventListener("click", function(e) {
      if (e.target.id === "month-prev") { prevMonth(); }
    });

    // 下月按钮
    document.addEventListener("click", function(e) {
      if (e.target.id === "month-next") { nextMonth(); }
    });

    // 点击日期格子
    document.addEventListener("click", function(e) {
      var cell = e.target.closest(".date-cell");
      if (!cell) { return; }
      var dateKey = cell.getAttribute("data-date");
      if (dateKey) { selectDate(dateKey); }
    });

    // 点击日历页中的日记卡片 → 编辑
    document.addEventListener("click", function(e) {
      var card = e.target.closest("#date-entries-list .entry-card");
      if (!card) { return; }
      var id = card.getAttribute("data-id");
      if (id && typeof Editor !== "undefined") { Editor.openEdit(id, "calendar"); }
    });

    // 监听保存事件，刷新日历
    window.addEventListener("entry-saved", function() {
      render();
    });
  }

  return {
    init: init,
    render: render,
    bindEvents: bindEvents
  };
})();
