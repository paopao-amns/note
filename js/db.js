/* ============================================================
   db.js — IndexedDB 数据层
   基于 Dexie.js，提供日记条目的全部 CRUD 操作
   ============================================================ */

var DiaryDB = (function() {
  "use strict";

  var db;

  // 等待 Dexie.js CDN 加载后初始化
  function init() {
    if (db) { return Promise.resolve(db); }
    return new Promise(function(resolve, reject) {
      if (typeof Dexie === "undefined") {
        reject(new Error("Dexie.js 未加载，请检查网络连接"));
        return;
      }
      db = new Dexie("DiaryDB");
      db.version(1).stores({
        entries: "id, createdAt"
      });
      db.open().then(function() {
        resolve(db);
      }).catch(reject);
    });
  }

  // 生成唯一 ID
  function uuid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // fallback
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 保存日记（新增或更新）
  function saveEntry(entry) {
    return init().then(function() {
      var now = new Date().toISOString();
      if (entry.id) {
        // 更新已有日记
        entry.updatedAt = now;
        return db.entries.put(entry).then(function() { return entry; });
      } else {
        // 新建日记
        entry.id = uuid();
        entry.createdAt = now;
        entry.updatedAt = now;
        if (!entry.media) { entry.media = []; }
        return db.entries.put(entry).then(function() { return entry; });
      }
    });
  }

  // 读取单条日记
  function getEntry(id) {
    return init().then(function() {
      return db.entries.get(id);
    });
  }

  // 删除日记
  function deleteEntry(id) {
    return init().then(function() {
      return db.entries.delete(id);
    });
  }

  // 分页获取日记列表，按创建时间倒序
  function listEntries(offset, limit) {
    offset = offset || 0;
    limit = limit || 30;
    return init().then(function() {
      return db.entries
        .orderBy("createdAt")
        .reverse()
        .offset(offset)
        .limit(limit)
        .toArray();
    });
  }

  // 按日期筛选日记（年月日可选，粒度逐步细化）
  function listByDate(year, month, day) {
    return init().then(function() {
      var collection = db.entries.orderBy("createdAt");
      return collection.reverse().filter(function(entry) {
        var d = new Date(entry.createdAt);
        if (d.getFullYear() !== year) { return false; }
        if (month != null && d.getMonth() + 1 !== month) { return false; }
        if (day != null && d.getDate() !== day) { return false; }
        return true;
      }).toArray();
    });
  }

  // 全文搜索（标题 + 正文）
  function searchEntries(keyword) {
    return init().then(function() {
      var kw = keyword.toLowerCase();
      return db.entries
        .orderBy("createdAt")
        .reverse()
        .filter(function(entry) {
          var title = (entry.title || "").toLowerCase();
          var content = (entry.content || "").toLowerCase();
          return title.indexOf(kw) !== -1 || content.indexOf(kw) !== -1;
        })
        .toArray();
    });
  }

  // 获取有日记的所有日期（供日历打点）
  function getDatesWithEntries() {
    return init().then(function() {
      return db.entries.toArray().then(function(entries) {
        var dates = {};
        entries.forEach(function(entry) {
          var d = new Date(entry.createdAt);
          var key = d.getFullYear() + "-" +
                    String(d.getMonth() + 1).padStart(2, "0") + "-" +
                    String(d.getDate()).padStart(2, "0");
          dates[key] = true;
        });
        return dates;
      });
    });
  }

  // 获取存储使用量估算
  function getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      return navigator.storage.estimate();
    }
    return Promise.resolve({ usage: 0, quota: 0 });
  }

  // ArrayBuffer → Base64 字符串
  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = "";
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Base64 字符串 → ArrayBuffer
  function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // 导出 JSON：获取所有日记，媒体转为 base64
  function exportJSON() {
    return init().then(function() {
      return db.entries.orderBy("createdAt").toArray().then(function(entries) {
        var data = entries.map(function(entry) {
          var e = { id: entry.id, title: entry.title, content: entry.content,
                    createdAt: entry.createdAt, updatedAt: entry.updatedAt, media: [] };
          if (entry.media) {
            entry.media.forEach(function(m) {
              e.media.push({
                id: m.id, type: m.type, name: m.name,
                data: arrayBufferToBase64(m.data),
                thumb: m.thumb ? arrayBufferToBase64(m.thumb) : null
              });
            });
          }
          return e;
        });

        var json = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries: data }, null, 2);
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "日记备份_" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return entries.length;
      });
    });
  }

  // 导入 JSON：解析备份文件，base64 还原为 ArrayBuffer，批量写入
  function importJSON(jsonText) {
    return init().then(function() {
      var data;
      try { data = JSON.parse(jsonText); } catch (e) { throw new Error("文件格式不正确"); }
      if (!data.entries || !Array.isArray(data.entries)) { throw new Error("无效的备份文件"); }

      var count = 0;
      return db.transaction("rw", db.entries, function() {
        data.entries.forEach(function(entry) {
          if (entry.media) {
            entry.media.forEach(function(m) {
              m.data = base64ToArrayBuffer(m.data);
              if (m.thumb) { m.thumb = base64ToArrayBuffer(m.thumb); }
            });
          }
          db.entries.put(entry).then(function() { count++; });
        });
      }).then(function() { return count; });
    });
  }

  // 导出 HTML：自包含单文件，图片内嵌 base64
  function exportHTML() {
    return init().then(function() {
      return db.entries.orderBy("createdAt").reverse().toArray().then(function(entries) {
        var html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n' +
          '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
          '<title>我的日记</title>\n<style>\n' +
          'body { font-family: -apple-system, "PingFang SC", sans-serif; max-width: 680px; margin: 0 auto; padding: 24px 20px; background: #fff; color: #1C1C1E; }\n' +
          'h1 { font-size: 26px; margin-bottom: 24px; }\n' +
          '.entry { margin-bottom: 36px; padding-bottom: 28px; border-bottom: 1px solid #E5E5EA; }\n' +
          '.entry-title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }\n' +
          '.entry-date { font-size: 13px; color: #6E6E73; margin-bottom: 14px; }\n' +
          '.entry-content { font-size: 16px; line-height: 1.8; white-space: pre-wrap; margin-bottom: 14px; }\n' +
          '.entry-media { display: flex; flex-wrap: wrap; gap: 8px; }\n' +
          '.entry-media img, .entry-media video { max-width: 200px; max-height: 200px; border-radius: 8px; object-fit: cover; }\n' +
          '</style>\n</head>\n<body>\n' +
          '<h1>📝 我的日记</h1>\n<p style="color:#6E6E73;margin-bottom:24px;">导出时间：' +
          new Date().toLocaleString("zh-CN") + ' &nbsp;|&nbsp; 共 ' + entries.length + ' 篇</p>\n';

        entries.forEach(function(entry) {
          var title = entry.title || "（无标题）";
          var date = new Date(entry.createdAt).toLocaleString("zh-CN");
          html += '<div class="entry">\n' +
            '<div class="entry-date">' + date + '</div>\n' +
            '<div class="entry-title">' + escHtml(title) + '</div>\n';
          if (entry.content) {
            html += '<div class="entry-content">' + escHtml(entry.content) + '</div>\n';
          }
          if (entry.media && entry.media.length > 0) {
            html += '<div class="entry-media">\n';
            entry.media.forEach(function(m) {
              var mime = m.type === "video" ? "video/mp4" : "image/jpeg";
              var dataUrl = "data:" + mime + ";base64," + arrayBufferToBase64(m.thumb || m.data);
              if (m.type === "image") {
                html += '<img src="' + dataUrl + '" alt="">\n';
              } else {
                html += '<video src="' + dataUrl + '" controls style="max-width:200px;"></video>\n';
              }
            });
            html += '</div>\n';
          }
          html += '</div>\n';
        });

        html += '</body>\n</html>';

        var blob = new Blob([html], { type: "text/html;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "日记_" + new Date().toISOString().slice(0, 10) + ".html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return entries.length;
      });
    });
  }

  function escHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  return {
    init: init,
    saveEntry: saveEntry,
    getEntry: getEntry,
    deleteEntry: deleteEntry,
    listEntries: listEntries,
    listByDate: listByDate,
    searchEntries: searchEntries,
    getDatesWithEntries: getDatesWithEntries,
    getStorageEstimate: getStorageEstimate,
    exportJSON: exportJSON,
    importJSON: importJSON,
    exportHTML: exportHTML,
    uuid: uuid
  };
})();
