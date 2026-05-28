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
    uuid: uuid
  };
})();
