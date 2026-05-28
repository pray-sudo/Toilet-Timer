const { formatDate, parseDateString, addDays, isToday, isYesterday } = require('./date');
const { formatDuration, formatDurationText, formatTime, formatDateTime } = require('./time');
const { getResultTag } = require('./guard');
const { RESULT_TAG_LABELS } = require('../config/copywriting');
const { getDateString } = require('./time');

const REMIND_LABELS = {
  triggered5m: '5分钟',
  triggered8m: '8分钟',
  triggered10m: '10分钟'
};

const REMIND_ACTION_LABELS = {
  confirm: '用户选择我知道了',
  stop: '用户选择立即起身',
  continue: '用户选择继续守护',
  show: '已触发提醒'
};

function sanitizeRecords(records) {
  if (!Array.isArray(records)) {
    console.warn('[stats] guardRecords is not an array, fallback to []');
    return [];
  }
  return records.map(normalizeRecord).filter(Boolean);
}

function normalizeRecord(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const normalized = { ...record };
  let duration = Number(normalized.duration);

  if ((!duration || duration <= 0) && normalized.startTime && normalized.endTime) {
    const start = new Date(normalized.startTime).getTime();
    const end = new Date(normalized.endTime).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      duration = Math.floor((end - start) / 1000);
    }
  }

  if (!duration || duration <= 0) {
    return null;
  }

  normalized.duration = duration;

  if (!normalized.date) {
    normalized.date = normalized.startTime
      ? getDateString(new Date(normalized.startTime))
      : getDateString(new Date());
  }

  if (!normalized.resultTag) {
    normalized.resultTag = getResultTag(duration);
  }

  normalized.isGoalAchieved = !!normalized.isGoalAchieved;
  normalized.triggered5m = !!normalized.triggered5m;
  normalized.triggered8m = !!normalized.triggered8m;
  normalized.triggered10m = !!normalized.triggered10m;
  normalized.remindEvents = Array.isArray(normalized.remindEvents) ? normalized.remindEvents : [];

  return normalized;
}

function getRecordsByDate(records, date) {
  const safeRecords = sanitizeRecords(records);
  const targetDate = date || formatDate(new Date());

  return safeRecords
    .filter((record) => record.date === targetDate)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

function calculateDailyStats(records, date) {
  const targetDate = date || formatDate(new Date());
  const dayRecords = getRecordsByDate(records, targetDate);
  const count = dayRecords.length;
  const totalDuration = dayRecords.reduce((sum, record) => sum + record.duration, 0);
  const avgDuration = count > 0 ? Math.round(totalDuration / count) : 0;
  const goalCount = dayRecords.filter((record) => record.isGoalAchieved).length;
  const goalRate = count > 0 ? goalCount / count : null;
  const riskCount = dayRecords.filter((record) => record.resultTag === 'risk').length;
  const overtimeCount = dayRecords.filter((record) => record.resultTag === 'overtime').length;

  return {
    date: targetDate,
    count,
    totalDuration,
    avgDuration,
    goalCount,
    goalRate,
    riskCount,
    overtimeCount,
    records: dayRecords,
    hasRecords: count > 0,
    summary: buildDailySummary({
      count,
      totalDuration,
      avgDuration,
      goalRate
    })
  };
}

function buildDailySummary(stats) {
  const { count, totalDuration, avgDuration, goalRate } = stats;

  return {
    countText: `${count}次`,
    totalDurationText: count > 0 ? formatDurationText(totalDuration) : '0分钟',
    avgDurationText: count > 0 ? formatDurationText(avgDuration) : '暂无',
    goalRateText: goalRate === null ? '暂无' : `${Math.round(goalRate * 100)}%`
  };
}

function getDailyEvaluation(stats) {
  if (!stats || !stats.hasRecords) {
    return {
      level: 'empty',
      title: '今天还没有守护记录',
      desc: '开始一次守护吧～',
      theme: 'gray'
    };
  }

  if (stats.riskCount > 0) {
    return {
      level: 'risk',
      title: '今天有一次时间偏长',
      desc: '建议下次及时起身活动，减少久蹲刷手机。',
      theme: 'red'
    };
  }

  if (stats.goalRate >= 1) {
    return {
      level: 'excellent',
      title: '今天表现很稳',
      desc: '全部都在推荐时间内完成！',
      theme: 'green'
    };
  }

  if (stats.goalRate >= 0.8) {
    return {
      level: 'good',
      title: '今天整体表现不错',
      desc: '大多数时候都能高效撤退，继续保持～',
      theme: 'green'
    };
  }

  if (stats.goalRate >= 0.5) {
    return {
      level: 'normal',
      title: '今天有进步空间',
      desc: '下次争取控制在 5 分钟内，效率会更高。',
      theme: 'orange'
    };
  }

  return {
    level: 'warning',
    title: '今天久蹲次数有点多',
    desc: '建议减少刷手机时间，到点及时起身。',
    theme: 'orange'
  };
}

function getDateDisplayText(dateStr) {
  const d = parseDateString(dateStr);
  const monthDay = `${padZero(d.getMonth() + 1)}月${padZero(d.getDate())}日`;

  if (isToday(dateStr)) {
    return `今天 ${monthDay}`;
  }

  if (isYesterday(dateStr)) {
    return `昨天 ${monthDay}`;
  }

  return `${d.getFullYear()}年${monthDay}`;
}

function padZero(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

function getRemindSummary(record) {
  const triggered = [];

  if (record.triggered5m) triggered.push('5分钟');
  if (record.triggered8m) triggered.push('8分钟');
  if (record.triggered10m) triggered.push('10分钟');

  if (!triggered.length) {
    return '未触发提醒';
  }

  return `已触发：${triggered.join('、')}提醒`;
}

function getGoalSummary(record) {
  if (record.isGoalAchieved) {
    return '5分钟内完成';
  }

  if (record.resultTag === 'overtime') {
    return '建议下次减少久蹲';
  }

  if (record.resultTag === 'risk') {
    return '建议及时起身活动';
  }

  return '已完成守护';
}

function mapRecordForList(record) {
  const startTime = formatTime(record.startTime);
  const endTime = formatTime(record.endTime);

  return {
    sessionId: record.sessionId,
    timeRangeText: `${startTime} - ${endTime}`,
    startTimeText: startTime,
    endTimeText: endTime,
    durationText: formatDuration(record.duration),
    durationDetailText: formatDurationText(record.duration),
    resultTag: record.resultTag,
    resultLabel: RESULT_TAG_LABELS[record.resultTag] || record.resultTag,
    isGoalAchieved: !!record.isGoalAchieved,
    goalSummary: getGoalSummary(record),
    remindSummary: getRemindSummary(record),
    statusLine: `${RESULT_TAG_LABELS[record.resultTag] || record.resultTag}｜${getGoalSummary(record)}`
  };
}

function getDateRange(startDate, endDate) {
  const result = [];
  let current = startDate;

  while (compareDateSafe(current, endDate) <= 0) {
    result.push(current);
    current = addDays(current, 1);
  }

  return result;
}

function compareDateSafe(dateA, dateB) {
  const a = parseDateString(dateA).getTime();
  const b = parseDateString(dateB).getTime();
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

function calculateRangeStats(records, startDate, endDate) {
  const safeRecords = sanitizeRecords(records);
  const dateRange = getDateRange(startDate, endDate);
  const dailyStats = dateRange.map((date) => calculateDailyStats(safeRecords, date));

  const totalCount = dailyStats.reduce((sum, item) => sum + item.count, 0);
  const totalDuration = dailyStats.reduce((sum, item) => sum + item.totalDuration, 0);
  const goalCount = dailyStats.reduce((sum, item) => sum + item.goalCount, 0);
  const riskCount = dailyStats.reduce((sum, item) => sum + item.riskCount, 0);

  return {
    startDate,
    endDate,
    totalCount,
    totalDuration,
    avgDuration: totalCount > 0 ? Math.round(totalDuration / totalCount) : 0,
    goalCount,
    goalRate: totalCount > 0 ? goalCount / totalCount : null,
    riskCount,
    dailyStats
  };
}

function calculateRecentDaysStats(records, days) {
  const safeDays = Math.max(1, Number(days) || 7);
  const endDate = formatDate(new Date());
  const startDate = addDays(endDate, -(safeDays - 1));
  return calculateRangeStats(records, startDate, endDate);
}

function getWeekRange(baseDate) {
  const date = parseDateString(baseDate || formatDate(new Date()));
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: formatDate(monday),
    endDate: formatDate(sunday)
  };
}

function calculateWeeklyStats(records, baseDate) {
  const range = getWeekRange(baseDate);
  return calculateRangeStats(records, range.startDate, range.endDate);
}

function calculateMonthlyStats(records, year, month) {
  const safeYear = Number(year) || new Date().getFullYear();
  const safeMonth = Number(month) || new Date().getMonth() + 1;
  const startDate = `${safeYear}-${padZero(safeMonth)}-01`;
  const lastDay = new Date(safeYear, safeMonth, 0).getDate();
  const endDate = `${safeYear}-${padZero(safeMonth)}-${padZero(lastDay)}`;
  return calculateRangeStats(records, startDate, endDate);
}

function getTodayStats(options) {
  const opts = options || {};
  let records = opts.records;

  if (!records) {
    const { getGuardRecords } = require('../services/record-service');
    records = getGuardRecords();
  }

  const today = opts.today || formatDate(new Date());
  const stats = calculateDailyStats(records, today);

  return {
    ...stats,
    recordList: stats.records.map(mapRecordForList),
    evaluation: getDailyEvaluation(stats)
  };
}

function findRecordBySessionId(records, sessionId) {
  const safeRecords = sanitizeRecords(records);
  return safeRecords.find((record) => record.sessionId === sessionId) || null;
}

function getRecordDetailView(record) {
  if (!record) {
    return null;
  }

  const resultTag = record.resultTag;
  const detailCopy = {
    excellent: '这次效率很高，继续保持～',
    good: '本次完成情况不错，建议继续保持。',
    overtime: '这次稍微久了一点，下次可以减少刷手机时间。',
    risk: '本次时间偏长，建议下次及时起身活动。'
  };

  const healthAdvice = {
    excellent: '建议如厕时尽量减少刷手机，把时间控制在 5 分钟左右。',
    good: '继续保持良好习惯，到点及时起身会更舒服。',
    overtime: '建议如厕时尽量减少刷手机，把时间控制在 5 分钟左右。',
    risk: '如果经常出现便血、疼痛、脱出等不适，请及时咨询医生。'
  };

  const remindDetails = [
    {
      key: 'triggered5m',
      label: '5分钟提醒',
      triggered: record.triggered5m,
      text: buildRemindDetailText(record, 'triggered5m', '5m')
    },
    {
      key: 'triggered8m',
      label: '8分钟提醒',
      triggered: record.triggered8m,
      text: buildRemindDetailText(record, 'triggered8m', '8m')
    },
    {
      key: 'triggered10m',
      label: '10分钟提醒',
      triggered: record.triggered10m,
      text: buildRemindDetailText(record, 'triggered10m', '10m')
    }
  ];

  var retreatLabel = null;
  if (record.mode === 'toilet_dispatch_game' && record.targetSeconds && record.duration) {
    var ts = record.targetSeconds;
    if (record.duration <= ts) retreatLabel = '完美撤退';
    else if (record.duration <= ts + 60) retreatLabel = '及时收工';
    else if (record.duration <= ts + 180) retreatLabel = '有点超时';
    else retreatLabel = '下次早点撤';
  }

  return {
    sessionId: record.sessionId,
    resultTag,
    resultLabel: RESULT_TAG_LABELS[resultTag] || resultTag,
    durationText: formatDuration(record.duration),
    durationDetailText: formatDurationText(record.duration),
    resultDesc: detailCopy[resultTag] || detailCopy.good,
    healthAdvice: healthAdvice[resultTag] || healthAdvice.good,
    startTimeText: formatDateTime(record.startTime),
    endTimeText: formatDateTime(record.endTime),
    dateText: `${parseDateString(record.date).getFullYear()}年${padZero(parseDateString(record.date).getMonth() + 1)}月${padZero(parseDateString(record.date).getDate())}日`,
    isGoalAchieved: !!record.isGoalAchieved,
    remindDetails,
    remindSummary: getRemindSummary(record),
    gameResult: record.gameResult || null,
    retreatLabel,
    mode: record.mode || 'normal',
    expGained: record.expGained || 0,
    toiletLevel: record.toiletLevel || null,
    toiletLevelName: record.toiletLevelName || null,
    toiletUpgraded: !!record.toiletUpgraded
  };
}

function buildRemindDetailText(record, triggerKey, eventType) {
  if (!record[triggerKey]) {
    return '未触发';
  }

  const event = (record.remindEvents || []).find((item) => item.type === eventType);
  if (!event || !event.userAction) {
    return '已触发';
  }

  return `已触发，${REMIND_ACTION_LABELS[event.userAction] || '已触发提醒'}`;
}

module.exports = {
  sanitizeRecords,
  normalizeRecord,
  getRecordsByDate,
  calculateDailyStats,
  getDailyEvaluation,
  formatDurationText,
  getDateDisplayText,
  mapRecordForList,
  getDateRange,
  calculateRangeStats,
  calculateRecentDaysStats,
  calculateWeeklyStats,
  calculateMonthlyStats,
  getTodayStats,
  findRecordBySessionId,
  getRecordDetailView,
  buildDailySummary
};
