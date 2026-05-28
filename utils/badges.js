const { calculateDailyStats, calculateMonthlyStats, sanitizeRecords } = require('./stats');
const { formatDate } = require('./date');

const BADGE_DEFINITIONS = [
  {
    badgeId: 'speed_master',
    badgeName: '速战速决',
    badgeDesc: '任意一次守护在 5 分钟内完成',
    acquireCondition: 'duration < 300 秒'
  },
  {
    badgeId: 'seven_days_streak',
    badgeName: '七日自律',
    badgeDesc: '连续 7 天至少有 1 次达标记录',
    acquireCondition: '连续 7 天 isGoalAchieved = true'
  },
  {
    badgeId: 'monthly_guardian',
    badgeName: '月度肛强卫士',
    badgeDesc: '当月达标率 ≥ 80%',
    acquireCondition: '当月 goalRate >= 0.8'
  },
  {
    badgeId: 'efficient_retreat',
    badgeName: '高效撤退达人',
    badgeDesc: '累计 30 次 5 分钟内完成',
    acquireCondition: '累计 30 次 isGoalAchieved = true'
  },
  {
    badgeId: 'risk_reduction',
    badgeName: '风险减少计划',
    badgeDesc: '连续 7 天没有 risk 记录',
    acquireCondition: '连续 7 天无 risk 记录'
  }
];

function hasSpeedMaster(records) {
  return sanitizeRecords(records).some((record) => record.duration < 300);
}

function countGoalAchieved(records) {
  return sanitizeRecords(records).filter((record) => record.isGoalAchieved).length;
}

function checkMonthlyGuardian(records, year, month) {
  const stats = calculateMonthlyStats(records, year, month);
  return stats.totalCount > 0 && stats.goalRate >= 0.8;
}

function getBadgeDefinitions() {
  return BADGE_DEFINITIONS.map((item) => ({ ...item, status: 'locked', unlockedTime: null }));
}

module.exports = {
  BADGE_DEFINITIONS,
  hasSpeedMaster,
  countGoalAchieved,
  checkMonthlyGuardian,
  getBadgeDefinitions
};
