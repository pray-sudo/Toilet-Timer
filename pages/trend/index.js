const { getGuardRecords } = require('../../services/record-service');
const { calculateRecentDaysStats } = require('../../utils/stats');
const { formatDurationText } = require('../../utils/time');
const { trackEvent } = require('../../utils/track');
const tp = require('../../services/toilet-progress');

var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function parseDateStr(s) {
  var parts = s.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

Page({
  data: {
    hasData: false,
    statCards: [],
    recentRiskCount: 0,
    chartBars: [],
    chartMaxLabel: ''
  },

  onShow() {
    this.loadTrend();
    trackEvent('trend_view', { fromPage: 'trend' });
  },

  loadTrend() {
    var records = getGuardRecords();
    var stats = calculateRecentDaysStats(records, 7);
    var hasData = stats.totalCount > 0;
    var goalRateText = stats.goalRate === null ? '暂无' : Math.round(stats.goalRate * 100) + '%';

    var statCards = [
      { label: '近7天次数', value: String(stats.totalCount), unit: '次' },
      { label: '平均时长', value: hasData ? formatDurationText(stats.avgDuration) : '暂无', unit: '' },
      { label: '达标率', value: goalRateText, unit: '' },
      { label: '风险记录', value: String(stats.riskCount), unit: '次' }
    ];

    var chartBars = [];
    var maxDuration = 0;
    var dailyStats = stats.dailyStats || [];

    for (var i = 0; i < dailyStats.length; i++) {
      if (dailyStats[i].totalDuration > maxDuration) {
        maxDuration = dailyStats[i].totalDuration;
      }
    }
    if (maxDuration < 60) maxDuration = 300;

    var today = new Date();
    var todayStr = today.getFullYear() + '-' +
      (today.getMonth() + 1 < 10 ? '0' : '') + (today.getMonth() + 1) + '-' +
      (today.getDate() < 10 ? '0' : '') + today.getDate();

    for (var j = 0; j < dailyStats.length; j++) {
      var ds = dailyStats[j];
      var d = parseDateStr(ds.date);
      var isToday = ds.date === todayStr;
      var weekday = isToday ? '今' : '周' + WEEKDAYS[d.getDay()];
      var pct = maxDuration > 0 ? Math.round((ds.totalDuration / maxDuration) * 100) : 0;
      var barColor = '#58b947';
      if (ds.riskCount > 0) barColor = '#e5484d';
      else if (ds.overtimeCount > 0) barColor = '#f59e0b';

      chartBars.push({
        date: ds.date,
        weekday: weekday,
        count: ds.count,
        totalMin: ds.totalDuration > 0 ? Math.round(ds.totalDuration / 60) : 0,
        heightPct: pct < 6 && ds.count > 0 ? 6 : pct,
        barColor: barColor,
        isEmpty: ds.count === 0,
        isToday: isToday
      });
    }

    var gameRecords = records.filter(function (r) { return r.mode === 'toilet_dispatch_game'; });
    var recentGameRecords = gameRecords.filter(function (r) {
      if (!r.date) return false;
      var rDate = parseDateStr(r.date).getTime();
      var weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return rDate >= weekAgo.getTime();
    });
    var gameCount = recentGameRecords.length;
    var gameTotalServed = 0, gameTotalCleaned = 0;
    for (var k = 0; k < recentGameRecords.length; k++) {
      var gr = recentGameRecords[k].gameResult;
      if (gr) {
        gameTotalServed += gr.servedUsers || 0;
        gameTotalCleaned += (gr.cleanedStalls || 0) + (gr.refilledPaper || 0) + (gr.fixedStalls || 0) + (gr.clearedTrash || 0);
      }
    }

    var progress = tp.getToiletProgress();
    var nextInfo = tp.getNextLevelInfo(progress.permanentLevel, progress.exp);
    var hasToiletProgress = progress.totalFinishedSessions > 0 || progress.exp > 0;

    var currentNeed = 0, expPct = 0;
    if (!nextInfo.isMax) {
      var prevNeed = 0;
      for (var m = 0; m < tp.PERMANENT_LEVEL_RULES.length; m++) {
        if (tp.PERMANENT_LEVEL_RULES[m].level === progress.permanentLevel) { prevNeed = tp.PERMANENT_LEVEL_RULES[m].needExp; break; }
      }
      currentNeed = nextInfo.needExp - prevNeed;
      expPct = currentNeed > 0 ? Math.min(Math.round(((progress.exp - prevNeed) / currentNeed) * 100), 100) : 100;
    } else { expPct = 100; }

    this.setData({
      hasData: hasData,
      statCards: statCards,
      recentRiskCount: stats.riskCount,
      chartBars: chartBars,
      chartMaxLabel: Math.round(maxDuration / 60) + '分钟',
      hasGameStats: gameCount > 0,
      gameStats: {
        count: gameCount,
        totalServed: gameTotalServed,
        totalTasks: gameTotalCleaned
      },
      hasToiletProgress: hasToiletProgress,
      toiletProgress: {
        permanentLevel: progress.permanentLevel,
        levelName: tp.getLevelName(progress.permanentLevel),
        exp: progress.exp,
        expPct: expPct,
        nextName: nextInfo.nextName,
        remaining: nextInfo.remaining,
        isMax: nextInfo.isMax,
        totalServedUsers: progress.totalServedUsers,
        totalOnTimeSessions: progress.totalOnTimeSessions,
        totalFinishedSessions: progress.totalFinishedSessions
      }
    });
  },

  handleStartGuard() {
    trackEvent('trend_empty_start_guard', { fromPage: 'trend' });
    wx.navigateTo({
      url: '/pages/guard/index',
      fail: function() { wx.showToast({ title: '跳转失败', icon: 'none' }); }
    });
  }
});
