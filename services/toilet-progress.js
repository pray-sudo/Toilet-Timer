var STORAGE_KEY = 'ghws_toilet_progress';
var DAILY_EXP_KEY = 'ghws_toilet_daily_exp';

var PERMANENT_LEVEL_RULES = [
  { level: 1, name: '普通小厕所', needExp: 0 },
  { level: 2, name: '整洁厕所', needExp: 120 },
  { level: 3, name: '舒适厕所', needExp: 360 },
  { level: 4, name: '高级厕所', needExp: 800 },
  { level: 5, name: '豪华大厕所', needExp: 1500 }
];

var LEVEL_CONFIG = {
  1: {
    name: '普通小厕所', stars: 1, stallCount: 2,
    enabledIssues: ['dirty', 'no_paper'],
    maxWaitSeconds: 35, useDurationRange: [8000, 13000],
    npcSpawnRange: [12000, 16000], className: 'level-1'
  },
  2: {
    name: '整洁厕所', stars: 2, stallCount: 3,
    enabledIssues: ['dirty', 'no_paper', 'trash_full'],
    maxWaitSeconds: 38, useDurationRange: [7600, 12500],
    npcSpawnRange: [11500, 15500], className: 'level-2'
  },
  3: {
    name: '舒适厕所', stars: 3, stallCount: 3,
    enabledIssues: ['dirty', 'no_paper', 'trash_full', 'broken'],
    maxWaitSeconds: 40, useDurationRange: [7200, 11800],
    npcSpawnRange: [11000, 15000], className: 'level-3'
  },
  4: {
    name: '高级厕所', stars: 4, stallCount: 4,
    enabledIssues: ['dirty', 'no_paper', 'trash_full', 'broken'],
    maxWaitSeconds: 42, useDurationRange: [6800, 11000],
    npcSpawnRange: [10500, 14500], className: 'level-4'
  },
  5: {
    name: '豪华大厕所', stars: 5, stallCount: 4,
    enabledIssues: ['dirty', 'no_paper', 'trash_full', 'broken'],
    maxWaitSeconds: 45, useDurationRange: [6500, 10500],
    npcSpawnRange: [10000, 14000], className: 'level-5'
  }
};

var SESSION_EXP_CAP = { 180: 30, 300: 50, 480: 70 };
var DAILY_EXP_LIMIT = 120;

function getDefaultProgress() {
  return {
    permanentLevel: 1, exp: 0,
    totalServedUsers: 0, totalFinishedSessions: 0,
    totalOnTimeSessions: 0, totalMissedUsers: 0,
    bestLevelAchievedAt: null, updatedAt: Date.now()
  };
}

function getToiletProgress() {
  try {
    var p = wx.getStorageSync(STORAGE_KEY);
    if (p && typeof p === 'object' && p.permanentLevel) return p;
  } catch (e) {}
  return getDefaultProgress();
}

function saveToiletProgress(progress) {
  try { wx.setStorageSync(STORAGE_KEY, progress); } catch (e) {}
}

function getLevelConfig(level) {
  return LEVEL_CONFIG[level] || LEVEL_CONFIG[1];
}

function getLevelName(level) {
  for (var i = 0; i < PERMANENT_LEVEL_RULES.length; i++) {
    if (PERMANENT_LEVEL_RULES[i].level === level) return PERMANENT_LEVEL_RULES[i].name;
  }
  return '普通小厕所';
}

function calculatePermanentLevel(exp) {
  var lv = 1;
  for (var i = PERMANENT_LEVEL_RULES.length - 1; i >= 0; i--) {
    if (exp >= PERMANENT_LEVEL_RULES[i].needExp) { lv = PERMANENT_LEVEL_RULES[i].level; break; }
  }
  return lv;
}

function getNextLevelInfo(currentLevel, currentExp) {
  if (currentLevel >= 5) return { nextLevel: 5, nextName: '豪华大厕所', needExp: 0, remaining: 0, isMax: true };
  var next = PERMANENT_LEVEL_RULES[currentLevel];
  return {
    nextLevel: next.level, nextName: next.name,
    needExp: next.needExp, remaining: Math.max(next.needExp - currentExp, 0), isMax: false
  };
}

function getOnTimeMultiplier(duration, targetSeconds) {
  var overtime = duration - targetSeconds;
  if (overtime <= 0) return 1;
  if (overtime <= 60) return 0.6;
  if (overtime <= 180) return 0.3;
  return 0;
}

function getTodayExpUsed() {
  try {
    var data = wx.getStorageSync(DAILY_EXP_KEY);
    if (data && data.date === getTodayStr()) return data.used || 0;
  } catch (e) {}
  return 0;
}

function addTodayExp(amount) {
  var today = getTodayStr();
  var used = 0;
  try {
    var data = wx.getStorageSync(DAILY_EXP_KEY);
    if (data && data.date === today) used = data.used || 0;
  } catch (e) {}
  try { wx.setStorageSync(DAILY_EXP_KEY, { date: today, used: used + amount }); } catch (e) {}
}

function getTodayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate();
}

function calculateSessionExp(record) {
  if (!record || record.finishAccuracy !== 'exact') return 0;
  if (!record.gameResult) return 0;

  var duration = record.duration || 0;
  var targetSeconds = record.targetSeconds || 300;
  var mult = getOnTimeMultiplier(duration, targetSeconds);
  if (mult <= 0) return 0;

  var gr = record.gameResult;
  var baseExp = 8;
  var servedExp = Math.min((gr.servedUsers || 0) * 2, 40);
  var cleanedExp = Math.min(((gr.cleanedStalls || 0) + (gr.refilledPaper || 0) + (gr.clearedTrash || 0)) * 1, 12);
  var fixedExp = Math.min((gr.fixedStalls || 0) * 2, 12);
  var penalty = Math.min((gr.missedUsers || 0) * 4, 24);
  var rawExp = Math.max(baseExp + servedExp + cleanedExp + fixedExp - penalty, 0);
  var sessionExp = Math.floor(rawExp * mult);

  var cap = SESSION_EXP_CAP[targetSeconds] || SESSION_EXP_CAP[300] || 50;
  sessionExp = Math.min(sessionExp, cap);

  var dailyUsed = getTodayExpUsed();
  var dailyRemaining = Math.max(DAILY_EXP_LIMIT - dailyUsed, 0);
  sessionExp = Math.min(sessionExp, dailyRemaining);

  return sessionExp;
}

function updateToiletProgress(expGained, record) {
  var progress = getToiletProgress();
  var gr = record.gameResult || {};

  var next = {
    permanentLevel: progress.permanentLevel,
    exp: progress.exp + expGained,
    totalServedUsers: progress.totalServedUsers + (gr.servedUsers || 0),
    totalFinishedSessions: progress.totalFinishedSessions + 1,
    totalOnTimeSessions: progress.totalOnTimeSessions + (record.duration <= record.targetSeconds ? 1 : 0),
    totalMissedUsers: progress.totalMissedUsers + (gr.missedUsers || 0),
    bestLevelAchievedAt: progress.bestLevelAchievedAt,
    updatedAt: Date.now()
  };

  var newLevel = calculatePermanentLevel(next.exp);
  var upgraded = false;
  if (newLevel > progress.permanentLevel) {
    next.permanentLevel = newLevel;
    next.bestLevelAchievedAt = Date.now();
    upgraded = true;
  }

  saveToiletProgress(next);
  if (expGained > 0) addTodayExp(expGained);

  return { progress: next, expGained: expGained, upgraded: upgraded, newLevelName: getLevelName(newLevel) };
}

module.exports = {
  getToiletProgress: getToiletProgress,
  saveToiletProgress: saveToiletProgress,
  getLevelConfig: getLevelConfig,
  getLevelName: getLevelName,
  getNextLevelInfo: getNextLevelInfo,
  calculateSessionExp: calculateSessionExp,
  updateToiletProgress: updateToiletProgress,
  calculatePermanentLevel: calculatePermanentLevel,
  PERMANENT_LEVEL_RULES: PERMANENT_LEVEL_RULES,
  LEVEL_CONFIG: LEVEL_CONFIG
};
