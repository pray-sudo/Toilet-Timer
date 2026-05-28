var recordService = require('../../services/record-service');
var subscribe = require('../../utils/subscribe');
var trackEvent = require('../../utils/track').trackEvent;
var tp = require('../../services/toilet-progress');

var ANIMALS = ['🐰', '🐻', '🐱', '🐶', '🐤', '🐧', '🦝'];
var ANIMAL_NAMES = { '🐰': '小兔', '🐻': '小熊', '🐱': '小猫', '🐶': '小狗', '🐤': '小鸭', '🐧': '小企鹅', '🦝': '小浣熊' };
var TOOL_MAP = { mop: 'dirty', paper: 'no_paper', trash: 'trash_full', wrench: 'broken' };
var TOOL_EMOJI = { mop: '🧹', paper: '🧻', trash: '🗑️', wrench: '🔧' };
var PROCESS_DURATION = { mop: 2500, paper: 1800, trash: 2200, wrench: 3000 };
var STALL_NAMES = ['1号', '2号', '3号', '4号'];

var SPAWN_CURVE = {
  1: { start: [5000, 7500], end: [2500, 4000] },
  2: { start: [4500, 7000], end: [2200, 3500] },
  3: { start: [4000, 6500], end: [2000, 3200] },
  4: { start: [3800, 6000], end: [1800, 3000] },
  5: { start: [3500, 5500], end: [1600, 2800] }
};

var LOG_ENTER = ['{n}来到队伍末尾啦', '{n}慢慢走进来了', '{n}也来排队了'];
var LOG_WAIT_Y = ['{n}有点着急了', '{n}已经等了一会儿'];
var LOG_WAIT_R = ['{n}已经等了很久了', '{n}需要一个空隔间'];
var LOG_SERVED = ['{n}顺利用上厕所啦', '{n}上完厕所了，一身轻松～', '{n}开心地离开了'];
var LOG_LEFT = ['{n}等太久了，去找其他厕所了', '{n}没等到空位，先离开了'];
var LOG_TOOL = { mop: '拖把出动，隔间清爽啦', paper: '厕纸补好啦', trash: '垃圾清走啦', wrench: '小故障修好啦' };

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(a, b) { return a + Math.random() * (b - a); }
function padZ(n) { return n < 10 ? '0' + n : '' + n; }
function fmtSec(s) { return padZ(Math.floor(s / 60)) + ':' + padZ(s % 60); }
function tpl(s, name) { return s.replace('{n}', name); }

function weightedPickFromIssues(enabledIssues) {
  var weights = { dirty: 0.45, no_paper: 0.22, trash_full: 0.18, broken: 0.12 };
  var pool = [], total = 0;
  for (var i = 0; i < enabledIssues.length; i++) {
    var w = weights[enabledIssues[i]] || 0.1;
    pool.push({ state: enabledIssues[i], w: w });
    total += w;
  }
  var idleChance = 0.06;
  var r = Math.random();
  if (r < idleChance) return 'idle';
  r = Math.random();
  var cum = 0;
  for (var j = 0; j < pool.length; j++) {
    cum += pool[j].w / total;
    if (r <= cum) return pool[j].state;
  }
  return pool.length > 0 ? pool[0].state : 'idle';
}

function createStalls(count) {
  var stalls = [];
  for (var i = 0; i < count; i++) {
    stalls.push({
      id: 'stall_' + (i + 1), num: STALL_NAMES[i] || (i + 1) + '号',
      status: 'idle', occupant: null, startedAt: 0, useDuration: 0, processingTool: ''
    });
  }
  return stalls;
}

Page({
  data: {
    statusBarHeight: 20, navBarHeight: 44, navTotalHeight: 64,
    sessionId: '', startTime: 0,
    targetSeconds: 300, elapsedSeconds: 0, remainingSeconds: 300, remainingText: '05:00',
    gameStatus: 'playing',
    queue: [], stalls: [],
    gameLogs: [],
    toiletLevel: 1, toiletLevelName: '普通小厕所', toiletLevelClass: 'level-1',
    gameResult: {
      servedUsers: 0, missedUsers: 0, cleanedStalls: 0,
      refilledPaper: 0, fixedStalls: 0, clearedTrash: 0, maxQueueLength: 0
    },
    resultVisible: false, overtimeText: '00:00',
    expGained: 0, expRemaining: 0, expNextName: '', expUpgraded: false,
    subscribeGuideVisible: false, subscribeStatus: 'none', subscribeLoading: false,
    dragging: false, dragType: '', dragEmoji: '', dragLabel: '', dragItemId: '',
    dragX: -999, dragY: -999, dragOverStall: ''
  },

  _ticker: null, _queueTimer: null, _settings: null, _stallRects: [],
  _npcCount: 0, _loggedWait: {}, _levelCfg: null,

  onLoad: function (options) {
    this.initNavBar();
    var targetMinutes = parseInt(options.targetMinutes, 10) || 5;
    var targetSeconds = targetMinutes * 60;
    var startTime = Date.now();
    var sessionId = 'guard_' + startTime;
    this._settings = require('../../services/settings-service').getUserSettings();
    this._loggedWait = {};

    var progress = tp.getToiletProgress();
    var lvl = progress.permanentLevel || 1;
    this._levelCfg = tp.getLevelConfig(lvl);

    var nextInfo = tp.getNextLevelInfo(lvl, progress.exp);

    this.setData({
      sessionId: sessionId, startTime: startTime,
      targetSeconds: targetSeconds, remainingSeconds: targetSeconds, remainingText: fmtSec(targetSeconds),
      gameStatus: 'playing', queue: [], gameLogs: [],
      stalls: createStalls(this._levelCfg.stallCount),
      toiletLevel: lvl, toiletLevelName: this._levelCfg.name,
      toiletLevelClass: this._levelCfg.className,
      gameResult: {
        servedUsers: 0, missedUsers: 0, cleanedStalls: 0,
        refilledPaper: 0, fixedStalls: 0, clearedTrash: 0, maxQueueLength: 0
      },
      expGained: 0, expRemaining: nextInfo.remaining, expNextName: nextInfo.nextName, expUpgraded: false
    });

    subscribe.saveRunningSession({
      sessionId: sessionId, startTime: new Date(startTime).toISOString(),
      startTimestamp: startTime, targetSeconds: targetSeconds,
      mode: 'toilet_dispatch_game', status: 'running', subscribeReminder: null
    });

    if (this._settings.wechatReminderEnabled !== false) this.setData({ subscribeGuideVisible: true });
    trackEvent('game_start', { sessionId: sessionId, targetMinutes: targetMinutes, toiletLevel: lvl });
    this.startTicker();
    this._npcCount = 0;
    this.spawnInitialWave();
    var self = this;
    setTimeout(function () { self.cacheStallRects(); }, 500);
  },

  spawnInitialWave: function () {
    var self = this;
    [300, 1000, 1800].forEach(function (d) {
      setTimeout(function () { if (self.data.gameStatus === 'playing') self.addQueueUser(); }, d);
    });
    setTimeout(function () { if (self.data.gameStatus === 'playing') self.startQueueGenerator(); }, 2800);
  },

  onShow: function () {
    if (this.data.gameStatus === 'playing') { this.syncTime(); this.startTicker(); this.startQueueGenerator(); }
    var self = this;
    setTimeout(function () { self.cacheStallRects(); }, 300);
  },
  onHide: function () { this.stopTicker(); this.stopQueueGenerator(); },
  onUnload: function () { this.stopTicker(); this.stopQueueGenerator(); },

  initNavBar: function () {
    try {
      var sys = wx.getSystemInfoSync(); var menu = wx.getMenuButtonBoundingClientRect();
      var sbh = sys.statusBarHeight || 20; var nbh = (menu.top - sbh) * 2 + menu.height;
      this.setData({ statusBarHeight: sbh, navBarHeight: nbh || 44, navTotalHeight: sbh + (nbh || 44) });
    } catch (e) {}
  },
  cacheStallRects: function () {
    var self = this;
    wx.createSelectorQuery().in(this).selectAll('.stall').boundingClientRect(function (rects) {
      if (rects && rects.length) self._stallRects = rects;
    }).exec();
  },

  pushLog: function (text, type) {
    var logs = [{ id: 'l' + Date.now() + Math.random().toString(36).slice(2, 5), text: text, type: type || 'normal' }].concat(this.data.gameLogs).slice(0, 3);
    this.setData({ gameLogs: logs });
  },

  // ============ 拖拽 ============
  onNpcTouchStart: function (e) {
    if (this.data.gameStatus !== 'playing' || this.data.dragging) return;
    var t = e.touches[0], idx = e.currentTarget.dataset.idx, npc = this.data.queue[idx];
    if (!npc || npc.status === 'entering') return;
    this.setData({ dragging: true, dragType: 'npc', dragEmoji: npc.emoji, dragLabel: npc.name, dragItemId: npc.id, dragX: t.clientX, dragY: t.clientY, dragOverStall: '' });
  },
  onToolTouchStart: function (e) {
    if (this.data.gameStatus !== 'playing' || this.data.dragging) return;
    var t = e.touches[0], tool = e.currentTarget.dataset.tool;
    this.setData({ dragging: true, dragType: 'tool', dragEmoji: TOOL_EMOJI[tool] || '🧹', dragLabel: '', dragItemId: tool, dragX: t.clientX, dragY: t.clientY, dragOverStall: '' });
  },
  onDragMove: function (e) {
    if (!this.data.dragging) return;
    var t = e.touches[0];
    this.setData({ dragX: t.clientX, dragY: t.clientY, dragOverStall: this.hitTestStall(t.clientX, t.clientY) });
  },
  onDragEnd: function (e) {
    if (!this.data.dragging) return;
    var ct = (e.changedTouches && e.changedTouches[0]) || { clientX: this.data.dragX, clientY: this.data.dragY };
    var over = this.hitTestStall(ct.clientX, ct.clientY);
    if (over) {
      if (this.data.dragType === 'npc') this.dropNpcOnStall(this.data.dragItemId, over);
      else this.dropToolOnStall(this.data.dragItemId, over);
    }
    this.setData({ dragging: false, dragType: '', dragEmoji: '', dragLabel: '', dragItemId: '', dragX: -999, dragY: -999, dragOverStall: '' });
  },
  hitTestStall: function (x, y) {
    for (var i = 0; i < this._stallRects.length; i++) {
      var r = this._stallRects[i];
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return this.data.stalls[i] ? this.data.stalls[i].id : '';
    }
    return '';
  },

  dropNpcOnStall: function (npcId, stallId) {
    var stall = null, si = -1;
    for (var i = 0; i < this.data.stalls.length; i++) { if (this.data.stalls[i].id === stallId) { stall = this.data.stalls[i]; si = i; break; } }
    if (!stall || stall.status !== 'idle') return;
    var ni = -1;
    for (var j = 0; j < this.data.queue.length; j++) { if (this.data.queue[j].id === npcId) { ni = j; break; } }
    if (ni < 0) return;
    var occ = this.data.queue[ni];
    var queue = this.data.queue.slice(); queue.splice(ni, 1);
    var cfg = this._levelCfg;
    var stalls = this.data.stalls.slice();
    stalls[si] = Object.assign({}, stall, { status: 'occupied', occupant: occ, startedAt: Date.now(), useDuration: rand(cfg.useDurationRange[0], cfg.useDurationRange[1]) });
    this.setData({ queue: queue, stalls: stalls });
  },

  dropToolOnStall: function (tool, stallId) {
    var ts = TOOL_MAP[tool]; if (!ts) return;
    var stall = null, si = -1;
    for (var i = 0; i < this.data.stalls.length; i++) { if (this.data.stalls[i].id === stallId) { stall = this.data.stalls[i]; si = i; break; } }
    if (!stall || stall.status !== ts) return;
    var stalls = this.data.stalls.slice();
    stalls[si] = Object.assign({}, stall, { status: 'processing', processingTool: tool, startedAt: Date.now(), useDuration: PROCESS_DURATION[tool] || 2500 });
    this.setData({ stalls: stalls });
  },

  // ============ 时间 & 状态 ============
  startTicker: function () { this.stopTicker(); var self = this; this._ticker = setInterval(function () { self.tick(); }, 300); },
  stopTicker: function () { if (this._ticker) { clearInterval(this._ticker); this._ticker = null; } },
  startQueueGenerator: function () { this.stopQueueGenerator(); this.scheduleNextNpc(); },
  stopQueueGenerator: function () { if (this._queueTimer) { clearTimeout(this._queueTimer); this._queueTimer = null; } },
  getSpawnDelay: function () {
    var progress = Math.min(this.data.elapsedSeconds / this.data.targetSeconds, 1);
    var curve = SPAWN_CURVE[this.data.toiletLevel] || SPAWN_CURVE[1];
    var lo = curve.start[0] + (curve.end[0] - curve.start[0]) * progress;
    var hi = curve.start[1] + (curve.end[1] - curve.start[1]) * progress;
    return rand(lo, hi);
  },
  scheduleNextNpc: function () {
    var self = this;
    this._queueTimer = setTimeout(function () {
      self.addQueueUser();
      if (self.data.gameStatus === 'playing') self.scheduleNextNpc();
    }, self.getSpawnDelay());
  },

  syncTime: function () {
    var elapsed = Math.floor((Date.now() - this.data.startTime) / 1000);
    var remaining = Math.max(this.data.targetSeconds - elapsed, 0);
    this.setData({ elapsedSeconds: elapsed, remainingSeconds: remaining, remainingText: fmtSec(remaining) });
    if (remaining <= 0 && this.data.gameStatus === 'playing') this.completeGame();
  },
  tick: function () {
    if (this.data.gameStatus !== 'playing' && this.data.gameStatus !== 'overtime') return;
    this.syncTime();
    if (this.data.gameStatus === 'playing') { this.updateStalls(); this.updateWaitLevels(); }
    if (this.data.gameStatus === 'overtime') this.setData({ overtimeText: fmtSec(Math.max(this.data.elapsedSeconds - this.data.targetSeconds, 0)) });
  },

  addQueueUser: function () {
    if (this.data.gameStatus !== 'playing' || this.data.queue.length >= 7) return;
    this._npcCount++;
    var emoji = pick(ANIMALS), name = ANIMAL_NAMES[emoji] || '小伙伴';
    var user = { id: 'npc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), emoji: emoji, name: name, status: 'entering', enterAt: Date.now(), waitStartAt: 0, waitLevel: 'green', waitSeconds: 0 };
    var queue = this.data.queue.concat(user);
    this.setData({ queue: queue, 'gameResult.maxQueueLength': Math.max(this.data.gameResult.maxQueueLength, queue.length) });
    this.pushLog(tpl(pick(LOG_ENTER), name), 'npc_enter');
    var self = this, uid = user.id;
    setTimeout(function () {
      var q = self.data.queue;
      for (var i = 0; i < q.length; i++) {
        if (q[i].id === uid && q[i].status === 'entering') { self.setData({ ['queue[' + i + '].status']: 'waiting', ['queue[' + i + '].waitStartAt']: Date.now() }); break; }
      }
    }, 900);
  },

  updateWaitLevels: function () {
    var now = Date.now(), maxWait = this._levelCfg.maxWaitSeconds;
    var queue = this.data.queue.slice(), missed = 0, remaining = [], self = this;
    for (var i = 0; i < queue.length; i++) {
      var npc = queue[i];
      if (npc.status === 'entering') { remaining.push(npc); continue; }
      var ws = Math.floor((now - npc.waitStartAt) / 1000);
      if (ws >= maxWait) { missed++; self.pushLog(tpl(pick(LOG_LEFT), npc.name), 'npc_left'); continue; }
      var lv = ws < 12 ? 'green' : ws < 25 ? 'yellow' : 'red';
      var lk = npc.id + '_' + lv;
      if (lv === 'yellow' && !self._loggedWait[lk]) { self._loggedWait[lk] = true; self.pushLog(tpl(pick(LOG_WAIT_Y), npc.name), 'npc_waiting'); }
      else if (lv === 'red' && !self._loggedWait[lk]) { self._loggedWait[lk] = true; self.pushLog(tpl(pick(LOG_WAIT_R), npc.name), 'npc_waiting'); }
      remaining.push(Object.assign({}, npc, { waitLevel: lv, waitSeconds: ws }));
    }
    var data = { queue: remaining };
    if (missed > 0) data['gameResult.missedUsers'] = this.data.gameResult.missedUsers + missed;
    this.setData(data);
  },

  updateStalls: function () {
    var now = Date.now(), served = 0, toolDone = {}, anyChange = false, self = this, cfg = this._levelCfg;
    var stalls = this.data.stalls.map(function (s) {
      if (s.status === 'occupied') {
        var elapsed = now - s.startedAt;
        if (elapsed >= s.useDuration) {
          served++; anyChange = true;
          if (s.occupant) self.pushLog(tpl(pick(LOG_SERVED), s.occupant.name), 'npc_served');
          var ns = weightedPickFromIssues(cfg.enabledIssues);
          if (ns !== 'idle') {
            var labels = { dirty: '需要打扫', no_paper: '缺纸了', trash_full: '垃圾桶满啦', broken: '出了小故障' };
            self.pushLog(s.num + '厕所' + (labels[ns] || '需要处理'), 'stall_issue');
          }
          return Object.assign({}, s, { status: ns, occupant: null, startedAt: 0, useDuration: 0, processingTool: '' });
        }
        return s;
      }
      if (s.status === 'processing') {
        var pe = now - s.startedAt;
        if (pe >= s.useDuration) {
          if (s.processingTool) { toolDone[s.processingTool] = (toolDone[s.processingTool] || 0) + 1; self.pushLog(LOG_TOOL[s.processingTool] || '处理完成', 'tool_done'); }
          anyChange = true;
          return Object.assign({}, s, { status: 'idle', occupant: null, startedAt: 0, useDuration: 0, processingTool: '' });
        }
        return s;
      }
      return s;
    });
    if (!anyChange) return;
    var data = { stalls: stalls };
    if (served > 0) data['gameResult.servedUsers'] = this.data.gameResult.servedUsers + served;
    if (toolDone.mop) data['gameResult.cleanedStalls'] = this.data.gameResult.cleanedStalls + toolDone.mop;
    if (toolDone.paper) data['gameResult.refilledPaper'] = this.data.gameResult.refilledPaper + toolDone.paper;
    if (toolDone.trash) data['gameResult.clearedTrash'] = this.data.gameResult.clearedTrash + toolDone.trash;
    if (toolDone.wrench) data['gameResult.fixedStalls'] = this.data.gameResult.fixedStalls + toolDone.wrench;
    this.setData(data);
  },

  // ============ 结束 ============
  completeGame: function () {
    this.stopQueueGenerator();
    this.pushLog('调度任务完成，现在该起身啦', 'game_end');
    this.calculateAndShowResult();
    this.setData({ gameStatus: 'completed', resultVisible: true, dragging: false });
    trackEvent('game_complete', { sessionId: this.data.sessionId, servedUsers: this.data.gameResult.servedUsers });
  },

  calculateAndShowResult: function () {
    var duration = Math.floor((Date.now() - this.data.startTime) / 1000);
    var mockRecord = { duration: duration, targetSeconds: this.data.targetSeconds, gameResult: this.data.gameResult, finishAccuracy: 'exact' };
    var expGained = tp.calculateSessionExp(mockRecord);
    var progress = tp.getToiletProgress();
    var nextInfo = tp.getNextLevelInfo(progress.permanentLevel, progress.exp + expGained);
    var wouldUpgrade = tp.calculatePermanentLevel(progress.exp + expGained) > progress.permanentLevel;
    this.setData({
      expGained: expGained,
      expRemaining: wouldUpgrade ? 0 : nextInfo.remaining,
      expNextName: wouldUpgrade ? tp.getLevelName(tp.calculatePermanentLevel(progress.exp + expGained)) : nextInfo.nextName,
      expUpgraded: wouldUpgrade
    });
  },

  onEnterOvertime: function () { this.setData({ gameStatus: 'overtime', resultVisible: false }); },

  onFinishGuard: function () {
    if (this.data.gameStatus === 'playing') {
      var self = this;
      wx.showModal({ title: '确定已经结束了吗？', content: '游戏还在进行中，确认结束将保存当前记录。', confirmText: '确认结束', cancelText: '继续玩', success: function (res) { if (res.confirm) self.doFinish('manual_click'); } });
      return;
    }
    this.doFinish('manual_click');
  },

  doFinish: function (source) {
    this.stopTicker(); this.stopQueueGenerator();
    var endTime = Date.now(), duration = Math.floor((endTime - this.data.startTime) / 1000);
    if (duration < 10) {
      wx.showToast({ title: '时间太短，未保存', icon: 'none' });
      subscribe.clearRunningSession();
      setTimeout(function () { wx.navigateBack({ delta: 1, fail: function () { wx.reLaunch({ url: '/pages/home/index' }); } }); }, 1200);
      return;
    }
    var resultTag = duration >= 600 ? 'risk' : duration >= 480 ? 'overtime' : duration >= 300 ? 'good' : 'excellent';

    var record = {
      sessionId: this.data.sessionId,
      startTime: new Date(this.data.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: duration,
      date: require('../../utils/time').getDateString(new Date(this.data.startTime)),
      resultTag: resultTag,
      isGoalAchieved: duration <= this.data.targetSeconds,
      triggered5m: false, triggered8m: false, triggered10m: false, remindEvents: [],
      mode: 'toilet_dispatch_game', targetSeconds: this.data.targetSeconds,
      gameResult: this.data.gameResult, finishSource: source, finishAccuracy: 'exact'
    };

    recordService.addGuardRecord(record);

    var expGained = tp.calculateSessionExp(record);
    var updateResult = tp.updateToiletProgress(expGained, record);
    record.expGained = expGained;
    record.toiletLevel = updateResult.progress.permanentLevel;
    record.toiletLevelName = tp.getLevelName(updateResult.progress.permanentLevel);
    record.toiletUpgraded = updateResult.upgraded;

    subscribe.cancelGuardReminderTask(this.data.sessionId);
    subscribe.clearRunningSession();
    trackEvent('game_finish', { sessionId: this.data.sessionId, duration: duration, servedUsers: this.data.gameResult.servedUsers, expGained: expGained });
    wx.redirectTo({ url: '/pages/report/index', fail: function () { wx.reLaunch({ url: '/pages/home/index' }); } });
  },

  handleBackTap: function () {
    if (this.data.gameStatus === 'playing') {
      var self = this;
      wx.showModal({ title: '游戏还在进行中', content: '直接离开将不保存本次记录，确定退出吗？', confirmText: '放弃退出', cancelText: '继续玩', confirmColor: '#e5484d', success: function (res) {
        if (res.confirm) { self.stopTicker(); self.stopQueueGenerator(); subscribe.cancelGuardReminderTask(self.data.sessionId); subscribe.clearRunningSession(); wx.navigateBack({ delta: 1, fail: function () { wx.reLaunch({ url: '/pages/home/index' }); } }); }
      } });
      return;
    }
    wx.navigateBack({ delta: 1, fail: function () { wx.reLaunch({ url: '/pages/home/index' }); } });
  },

  onEnableSubscribe: function () {
    if (this.data.subscribeLoading) return;
    this.setData({ subscribeLoading: true });
    var self = this, remindAt = this.data.startTime + this.data.targetSeconds * 1000;
    subscribe.requestGuardReminderSubscribe().then(function (res) {
      if (res.status === 'accept') {
        self.setData({ subscribeStatus: 'accepted', subscribeGuideVisible: false, subscribeLoading: false });
        subscribe.createGuardReminderTask({ sessionId: self.data.sessionId, startTime: new Date(self.data.startTime).toISOString(), remindAt: remindAt, remindType: 'target' });
        wx.showToast({ title: '已开启微信提醒', icon: 'success' });
      } else { self.setData({ subscribeStatus: 'rejected', subscribeGuideVisible: false, subscribeLoading: false }); }
    }).catch(function () { self.setData({ subscribeStatus: 'failed', subscribeGuideVisible: false, subscribeLoading: false }); });
  },
  onSkipSubscribe: function () { this.setData({ subscribeGuideVisible: false, subscribeStatus: 'skipped' }); }
});
