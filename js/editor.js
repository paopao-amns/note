/* ============================================================
   editor.js — 日记编辑器（全屏二级页面）
   负责：新建/编辑日记、媒体插入、页面导航
   ============================================================ */

var Editor = (function() {
  "use strict";

  var currentEntry = null;  // 当前编辑的日记（null = 新建）
  var isOpen = false;
  var returnToPage = "list"; // 保存/返回后跳回的页面

  // DOM 元素
  var editorPage, editorTitle, editorPageTitle, textContent;
  var mediaGrid, btnSave, btnBack, editorDate;
  var fileImage, fileVideo;

  function cacheDom() {
    editorPage = document.getElementById("page-editor");
    editorTitle = document.getElementById("editor-title");
    editorPageTitle = document.getElementById("editor-page-title");
    textContent = document.getElementById("editor-content");
    mediaGrid = document.getElementById("media-grid");
    btnSave = document.getElementById("editor-save");
    btnBack = document.getElementById("editor-back");
    editorDate = document.getElementById("editor-date");
    fileImage = document.getElementById("file-image");
    fileVideo = document.getElementById("file-video");
  }

  // 打开编辑器——新建模式
  function openNew(fromPage) {
    cacheDom();
    if (!editorPage) { return; }
    returnToPage = fromPage || "list";
    currentEntry = null;
    if (editorTitle) { editorTitle.value = ""; }
    if (textContent) { textContent.value = ""; }
    if (mediaGrid) { mediaGrid.innerHTML = ""; }
    if (editorPageTitle) { editorPageTitle.textContent = "新建日记"; }
    if (editorDate) { editorDate.textContent = ""; }
    showPage();
  }

  // 打开编辑器——编辑模式
  function openEdit(id, fromPage) {
    cacheDom();
    if (!editorPage) { return; }
    returnToPage = fromPage || "list";

    DiaryDB.getEntry(id).then(function(entry) {
      if (!entry) { return; }
      currentEntry = entry;
      if (editorTitle) { editorTitle.value = entry.title || ""; }
      if (textContent) { textContent.value = entry.content || ""; }
      if (editorPageTitle) { editorPageTitle.textContent = "编辑日记"; }
      if (editorDate) { editorDate.textContent = "创建于 " + formatDate(entry.createdAt); }
      renderMedia(entry.media);
      showPage();
    }).catch(function(err) {
      window.alert("加载日记失败: " + err.message);
    });
  }

  // 显示编辑器页面
  function showPage() {
    isOpen = true;

    // 先移除其他所有页面的 active，避免两个页面同时显示
    var allPages = document.querySelectorAll(".page");
    for (var i = 0; i < allPages.length; i++) {
      allPages[i].classList.remove("active");
    }
    editorPage.classList.add("active");

    // 隐藏 tab 栏和 FAB
    var tabBar = document.querySelector(".tab-bar");
    var fab = document.getElementById("fab-new");
    if (tabBar) { tabBar.style.display = "none"; }
    if (fab) { fab.style.display = "none"; }

    document.body.style.overflow = "hidden";
    setTimeout(function() {
      if (editorTitle) { editorTitle.focus(); }
    }, 300);
  }

  // 关闭编辑器，返回上一页
  function close() {
    if (!isOpen) { return; }
    isOpen = false;
    currentEntry = null;

    editorPage.classList.remove("active");

    // 恢复 tab 栏和 FAB
    var tabBar = document.querySelector(".tab-bar");
    var fab = document.getElementById("fab-new");
    if (tabBar) { tabBar.style.display = ""; }
    if (fab) { fab.style.display = ""; }

    document.body.style.overflow = "";

    // 触发页面切换以刷新列表
    App.switchTab(returnToPage);
  }

  // 保存日记
  function save() {
    var title = editorTitle ? editorTitle.value.trim() : "";
    var content = textContent ? textContent.value.trim() : "";

    // 不允许内容全部为空
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
      window.dispatchEvent(new CustomEvent("entry-saved", { detail: saved }));
    }).catch(function(err) {
      showToast("保存失败: " + err.message);
    });
  }

  // 渲染媒体缩略图
  function renderMedia(mediaList) {
    if (!mediaGrid) { return; }
    mediaGrid.innerHTML = "";
    if (!mediaList || mediaList.length === 0) { return; }
    mediaList.forEach(function(item, index) {
      var div = document.createElement("div");
      div.className = "media-item";
      var url;
      if (item.type === "image") {
        url = URL.createObjectURL(new Blob([item.data], { type: "image/jpeg" }));
        div.innerHTML = '<img src="' + url + '" alt="" loading="lazy">' +
          '<button type="button" class="media-remove" data-index="' + index + '">&times;</button>';
      } else {
        // 视频优先显示缩略图
        var thumbData = item.thumb || item.data;
        var mime = item.thumb ? "image/jpeg" : "video/mp4";
        url = URL.createObjectURL(new Blob([thumbData], { type: mime }));
        if (item.thumb) {
          div.innerHTML = '<img src="' + url + '" alt="">' +
            '<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:24px;">▶️</span>' +
            '<button type="button" class="media-remove" data-index="' + index + '">&times;</button>';
        } else {
          div.innerHTML = '<video src="' + url + '" muted></video>' +
            '<button type="button" class="media-remove" data-index="' + index + '">&times;</button>';
        }
      }
      mediaGrid.appendChild(div);
    });
  }

  // 删除媒体
  function removeMedia(index) {
    if (!currentEntry || !currentEntry.media) { return; }
    currentEntry.media.splice(index, 1);
    renderMedia(currentEntry.media);
  }

  // 添加媒体文件
  function addMediaFiles(files, type) {
    if (!files || files.length === 0) { return; }
    if (!currentEntry) {
      currentEntry = { id: null, title: "", content: "", media: [], createdAt: new Date().toISOString() };
    }
    if (!currentEntry.media) { currentEntry.media = []; }

    Array.from(files).forEach(function(file) {
      if (type === "image") {
        compressImage(file, function(compressedBuf) {
          currentEntry.media.push({
            id: DiaryDB.uuid(),
            type: "image",
            data: compressedBuf,
            name: file.name
          });
          renderMedia(currentEntry.media);
        });
      } else {
        // 视频暂不压缩，但先生成缩略图
        var reader = new FileReader();
        reader.onload = function(e) {
          var buf = e.target.result;
          currentEntry.media.push({
            id: DiaryDB.uuid(),
            type: "video",
            data: buf,
            name: file.name
          });
          renderMedia(currentEntry.media);
          // 异步生成视频缩略图
          generateVideoThumb(file, currentEntry.media.length - 1);
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }

  // 图片压缩：Canvas 缩放至最大宽度 800px，JPEG 质量 0.7
  function compressImage(file, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var w = img.width;
        var h = img.height;
        if (w <= 800) {
          // 不需要压缩，直接读为 ArrayBuffer
          readerOnLoadToBuf(e.target.result, callback);
          return;
        }
        var ratio = 800 / w;
        var newW = 800;
        var newH = Math.round(h * ratio);
        var canvas = document.createElement("canvas");
        canvas.width = newW;
        canvas.height = newH;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, newW, newH);
        canvas.toBlob(function(blob) {
          var blobReader = new FileReader();
          blobReader.onload = function(ev) {
            callback(ev.target.result);
          };
          blobReader.readAsArrayBuffer(blob);
        }, "image/jpeg", 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // 小图片直接转 ArrayBuffer
  function readerOnLoadToBuf(dataUrl, callback) {
    // dataURL → ArrayBuffer
    var parts = dataUrl.split(",");
    // base64 → binary
    var binary = atob(parts[1]);
    var buf = new ArrayBuffer(binary.length);
    var view = new Uint8Array(buf);
    for (var i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    callback(buf);
  }

  // 生成视频缩略图
  function generateVideoThumb(file, mediaIndex) {
    var video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    var blobUrl = URL.createObjectURL(file);
    video.src = blobUrl;

    video.onloadeddata = function() {
      video.currentTime = 1; // 跳到第 1 秒
    };

    video.onseeked = function() {
      var canvas = document.createElement("canvas");
      var w = video.videoWidth;
      var h = video.videoHeight;
      canvas.width = Math.min(w, 400);
      canvas.height = Math.round(h * (canvas.width / w));
      var ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function(blob) {
        var blobReader = new FileReader();
        blobReader.onload = function(ev) {
          if (currentEntry && currentEntry.media && currentEntry.media[mediaIndex]) {
            currentEntry.media[mediaIndex].thumb = ev.target.result;
            renderMedia(currentEntry.media);
          }
        };
        blobReader.readAsArrayBuffer(blob);
      }, "image/jpeg", 0.7);
      URL.revokeObjectURL(blobUrl);
    };

    video.onerror = function() {
      URL.revokeObjectURL(blobUrl);
    };
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
    // 保存按钮
    document.addEventListener("click", function(e) {
      if (e.target.id === "editor-save") { save(); }
    });

    // 返回按钮
    document.addEventListener("click", function(e) {
      if (e.target.id === "editor-back") { close(); }
    });

    // 添加图片
    document.addEventListener("click", function(e) {
      if (e.target.id === "btn-add-image") {
        var el = document.getElementById("file-image");
        if (el) { el.click(); }
      }
    });

    // 添加视频
    document.addEventListener("click", function(e) {
      if (e.target.id === "btn-add-video") {
        var el = document.getElementById("file-video");
        if (el) { el.click(); }
      }
    });

    // 文件选择
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

    // 删除媒体
    document.addEventListener("click", function(e) {
      if (e.target.classList.contains("media-remove")) {
        var idx = parseInt(e.target.getAttribute("data-index"));
        removeMedia(idx);
      }
    });
  }

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
