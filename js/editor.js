/* ============================================================
   editor.js — 日记编辑器
   负责：新建/编辑日记、模态窗控制、保存逻辑
   ============================================================ */

var Editor = (function() {
  "use strict";

  var currentEntry = null;  // 当前编辑的日记（null 表示新建）
  var isOpen = false;

  // DOM 元素引用
  var overlay, modal, btnCancel, btnSave, inputTitle, textContent;
  var modalTitle, editorDate, fileImage, fileVideo, mediaGrid;

  function cacheDom() {
    overlay = document.getElementById("modal-overlay");
    modal = document.getElementById("modal-editor");
    btnCancel = document.getElementById("modal-cancel");
    btnSave = document.getElementById("modal-save");
    inputTitle = document.getElementById("editor-title");
    textContent = document.getElementById("editor-content");
    modalTitle = document.getElementById("modal-title");
    editorDate = document.getElementById("editor-date");
    fileImage = document.getElementById("file-image");
    fileVideo = document.getElementById("file-video");
    mediaGrid = document.getElementById("media-grid");
  }

  // 打开编辑器——新建模式
  function openNew() {
    cacheDom();
    if (!overlay) { return; }
    currentEntry = null;
    if (inputTitle) { inputTitle.value = ""; }
    if (textContent) { textContent.value = ""; }
    if (mediaGrid) { mediaGrid.innerHTML = ""; }
    if (modalTitle) { modalTitle.textContent = "新建日记"; }
    if (editorDate) { editorDate.textContent = ""; }
    show();
  }

  // 打开编辑器——编辑模式
  function openEdit(id) {
    cacheDom();
    DiaryDB.getEntry(id).then(function(entry) {
      if (!entry) { return; }
      currentEntry = entry;
      inputTitle.value = entry.title || "";
      textContent.value = entry.content || "";
      modalTitle.textContent = "编辑日记";
      editorDate.textContent = "创建于 " + formatDate(entry.createdAt);
      renderMedia(entry.media);
      show();
    });
  }

  // 显示模态窗
  function show() {
    if (!overlay) { return; }
    isOpen = true;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(function() {
      if (inputTitle) { inputTitle.focus(); }
    }, 100);
  }

  // 关闭模态窗
  function close() {
    isOpen = false;
    modal.classList.add("closing");
    setTimeout(function() {
      overlay.classList.remove("open");
      modal.classList.remove("closing");
      document.body.style.overflow = "";
      currentEntry = null;
    }, 180);
  }

  // 保存日记
  function save() {
    var title = inputTitle.value.trim();
    var content = textContent.value.trim();

    // 允许空标题，但不允许标题和内容都为空
    if (!title && !content && (!currentEntry || !currentEntry.media || currentEntry.media.length === 0)) {
      showToast("请输入标题或内容");
      return;
    }

    var entry = currentEntry ? {
      id: currentEntry.id,
      title: title,
      content: content,
      media: currentEntry.media || [],
      createdAt: currentEntry.createdAt
    } : {
      title: title,
      content: content,
      media: []
    };

    DiaryDB.saveEntry(entry).then(function(saved) {
      close();
      // 通知列表刷新
      window.dispatchEvent(new CustomEvent("entry-saved", { detail: saved }));
    }).catch(function(err) {
      showToast("保存失败: " + err.message);
    });
  }

  // 渲染已添加的媒体（阶段 4 完善）
  function renderMedia(mediaList) {
    if (!mediaGrid) { return; }
    mediaGrid.innerHTML = "";
    if (!mediaList || mediaList.length === 0) { return; }
    mediaList.forEach(function(item, index) {
      var div = document.createElement("div");
      div.className = "media-item";
      var blob = new Blob([item.data], { type: item.type === "video" ? "video/mp4" : "image/jpeg" });
      var url = URL.createObjectURL(blob);
      if (item.type === "image") {
        div.innerHTML = '<img src="' + url + '" alt="">' +
          '<button class="media-remove" data-index="' + index + '">&times;</button>';
      } else {
        div.innerHTML = '<video src="' + url + '" muted></video>' +
          '<button class="media-remove" data-index="' + index + '">&times;</button>';
      }
      mediaGrid.appendChild(div);
    });
  }

  // 删除媒体附件
  function removeMedia(index) {
    if (!currentEntry || !currentEntry.media) { return; }
    currentEntry.media.splice(index, 1);
    renderMedia(currentEntry.media);
  }

  // 添加媒体文件（阶段 4 完善）
  function addMediaFiles(files, type) {
    if (!files || files.length === 0) { return; }
    if (!currentEntry) {
      // 新建模式下，先将空壳作为 currentEntry
      currentEntry = { id: null, title: "", content: "", media: [], createdAt: new Date().toISOString() };
    }
    if (!currentEntry.media) { currentEntry.media = []; }

    Array.from(files).forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        currentEntry.media.push({
          id: DiaryDB.uuid(),
          type: type,
          data: e.target.result,
          name: file.name
        });
        renderMedia(currentEntry.media);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.getFullYear() + "-" +
           String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0") + " " +
           String(d.getHours()).padStart(2, "0") + ":" +
           String(d.getMinutes()).padStart(2, "0");
  }

  function showToast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 2000);
  }

  // 事件绑定
  function bindEvents() {
    // 取消按钮
    document.addEventListener("click", function(e) {
      if (e.target.id === "modal-cancel") { close(); }
    });

    // 保存按钮
    document.addEventListener("click", function(e) {
      if (e.target.id === "modal-save") { save(); }
    });

    // 点击遮罩关闭
    document.addEventListener("click", function(e) {
      if (e.target === overlay && isOpen) { close(); }
    });

    // 添加图片按钮
    document.addEventListener("click", function(e) {
      if (e.target.id === "btn-add-image") {
        fileImage = document.getElementById("file-image");
        if (fileImage) { fileImage.click(); }
      }
    });

    // 添加视频按钮
    document.addEventListener("click", function(e) {
      if (e.target.id === "btn-add-video") {
        fileVideo = document.getElementById("file-video");
        if (fileVideo) { fileVideo.click(); }
      }
    });

    // 文件选择变化
    document.addEventListener("change", function(e) {
      if (e.target.id === "file-image") {
        addMediaFiles(e.target.files, "image");
        e.target.value = "";
      }
      if (e.target.id === "file-video") {
        addMediaFiles(e.target.files, "video");
        e.target.value = "";
      }
    });

    // 删除媒体（通过事件委托）
    document.addEventListener("click", function(e) {
      if (e.target.classList.contains("media-remove")) {
        var idx = parseInt(e.target.getAttribute("data-index"));
        removeMedia(idx);
      }
    });
  }

  // 初始化
  function init() {
    cacheDom();
    bindEvents();
  }

  return {
    init: init,
    openNew: openNew,
    openEdit: openEdit,
    close: close
  };
})();
