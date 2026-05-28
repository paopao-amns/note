/* ============================================================
   search.js — 搜索模块
   负责：全文搜索、防抖输入、高亮结果
   ============================================================ */

var SearchPage = (function() {
  "use strict";

  var searchInput, resultList, searchHint;
  var debounceTimer;

  function cacheDom() {
    searchInput = document.getElementById("search-input");
    resultList = document.getElementById("search-result-list");
    searchHint = document.getElementById("search-hint");
  }

  function init() {
    cacheDom();
    bindEvents();
  }

  // 执行搜索
  function doSearch(keyword) {
    if (!resultList) { cacheDom(); }
    if (!resultList) { return; }

    keyword = keyword.trim();

    if (!keyword) {
      resultList.innerHTML = "";
      if (searchHint) { searchHint.style.display = "block"; }
      return;
    }

    DiaryDB.searchEntries(keyword).then(function(entries) {
      if (searchHint) { searchHint.style.display = "none"; }

      if (entries.length === 0) {
        resultList.innerHTML = '<p style="text-align:center;color:var(--text-sub);font-size:14px;padding:30px 0;">没有找到相关日记</p>';
        return;
      }

      var html = '<p style="font-size:13px;color:var(--text-sub);margin-bottom:12px;">共 ' + entries.length + ' 条结果</p>';
      entries.forEach(function(entry) {
        html += renderResult(entry, keyword);
      });
      resultList.innerHTML = html;
    }).catch(function(err) {
      resultList.innerHTML = '<p style="text-align:center;color:var(--danger);font-size:14px;padding:30px 0;">搜索失败，请重试</p>';
    });
  }

  // 渲染单条搜索结果
  function renderResult(entry, keyword) {
    var title = entry.title || "（无标题）";
    var content = entry.content || "";

    // 高亮关键词
    var titleHtml = highlight(title, keyword);
    var previewHtml = highlight(content.substring(0, 100), keyword);
    if (content.length > 100) { previewHtml += "..."; }

    var date = formatDate(entry.createdAt);

    var thumbHtml = "";
    if (entry.media && entry.media.length > 0 && entry.media[0].type === "image" && entry.media[0].data) {
      var blob = new Blob([entry.media[0].data], { type: "image/jpeg" });
      var url = URL.createObjectURL(blob);
      thumbHtml = '<img class="entry-card-thumb" src="' + url + '" alt="" style="float:right;margin-left:8px;">';
    }

    return (
      '<div class="search-result-item" data-id="' + entry.id + '">' +
        thumbHtml +
        '<div class="search-result-title">' + titleHtml + "</div>" +
        '<div class="search-result-preview">' + previewHtml + "</div>" +
        '<div class="search-result-date">' + date + "</div>" +
      "</div>"
    );
  }

  // 关键词高亮（大小写不敏感）
  function highlight(text, keyword) {
    if (!keyword || !text) { return escHtml(text); }
    var escaped = escHtml(text);
    var kw = escHtml(keyword);
    var regex = new RegExp("(" + kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
    return escaped.replace(regex, "<mark>$1</mark>");
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.getFullYear() + "年" +
           (d.getMonth() + 1) + "月" +
           d.getDate() + "日 " +
           String(d.getHours()).padStart(2, "0") + ":" +
           String(d.getMinutes()).padStart(2, "0");
  }

  function escHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  // 事件绑定
  function bindEvents() {
    // 搜索输入（300ms 防抖）
    document.addEventListener("input", function(e) {
      if (e.target.id !== "search-input") { return; }
      clearTimeout(debounceTimer);
      var keyword = e.target.value;
      debounceTimer = setTimeout(function() {
        doSearch(keyword);
      }, 300);
    });

    // 点击搜索结果 → 编辑
    document.addEventListener("click", function(e) {
      var item = e.target.closest(".search-result-item");
      if (!item) { return; }
      var id = item.getAttribute("data-id");
      if (id && typeof Editor !== "undefined") { Editor.openEdit(id); }
    });

    // 监听保存事件，重新搜索
    window.addEventListener("entry-saved", function() {
      if (searchInput && searchInput.value.trim()) {
        doSearch(searchInput.value.trim());
      }
    });
  }

  return {
    init: init,
    doSearch: doSearch
  };
})();
