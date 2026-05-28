const { getDateString } = require('./time');

const REMINDER_CONFIG = [
  {
    type: 'risk',
    key: 'triggered10m',
    eventType: '10m',
    settingsTimeKey: 'remind10Time',
    settingsEnabledKey: 'remind10Enabled',
    priority: 3
  },
  {
    type: 'warning',
    key: 'triggered8m',
    eventType: '8m',
    settingsTimeKey: 'remind8Time',
    settingsEnabledKey: 'remind8Enabled',
    priority: 2
  },
  {
    type: 'mild',
    key: 'triggered5m',
    eventType: '5m',
    settingsTimeKey: 'remind5Time',
    settingsEnabledKey: 'remind5Enabled',
    priority: 1
  }
];

function getStageByDuration(duration) {
  const safeDuration = Math.max(0, Math.floor(Number(duration) || 0));

  if (safeDuration < 300) {
    return {
      stage: 'normal',
      resultTag: 'excellent',
      stageText: '状态良好，保持高效～',
      theme: 'green'
    };
  }

  if (safeDuration < 480) {
    return {
      stage: 'target',
      resultTag: 'good',
      stageText: '目标达成，可以考虑撤退啦～',
      theme: 'green'
    };
  }

  if (safeDuration < 600) {
    return {
      stage: 'warning',
      resultTag: 'overtime',
      stageText: '时间有点久了，建议尽快结束',
      theme: 'orange'
    };
  }

  return {
    stage: 'risk',
    resultTag: 'risk',
    stageText: '进入"痔"风险区域，建议立即起身',
    theme: 'red'
  };
}

function getResultTag(duration) {
  return getStageByDuration(duration).resultTag;
}

function getReminderToTrigger(duration, settings, triggeredState) {
  const safeDuration = Math.max(0, Math.floor(Number(duration) || 0));
  const safeSettings = settings || {};
  const safeTriggered = triggeredState || {};

  for (let i = 0; i < REMINDER_CONFIG.length; i += 1) {
    const item = REMINDER_CONFIG[i];
    const remindTime = safeSettings[item.settingsTimeKey];
    const remindEnabled = safeSettings[item.settingsEnabledKey];

    if (
      safeDuration >= remindTime &&
      !safeTriggered[item.key] &&
      remindEnabled !== false
    ) {
      return {
        type: item.type,
        key: item.key,
        eventType: item.eventType,
        priority: item.priority,
        remindTime
      };
    }
  }

  return null;
}

function buildGuardRecord(sessionData, endTimestamp, settings) {
  const startTimestamp = sessionData.startTimestamp;
  const duration = Math.max(0, Math.floor((endTimestamp - startTimestamp) / 1000));
  const stageInfo = getStageByDuration(duration);
  const recommendedDuration = (settings && settings.recommendedDuration) || 300;

  return {
    sessionId: sessionData.sessionId,
    startTime: new Date(startTimestamp).toISOString(),
    endTime: new Date(endTimestamp).toISOString(),
    duration,
    date: getDateString(new Date(endTimestamp)),
    resultTag: stageInfo.resultTag,
    isGoalAchieved: duration < recommendedDuration,
    triggered5m: !!sessionData.triggered5m,
    triggered8m: !!sessionData.triggered8m,
    triggered10m: !!sessionData.triggered10m,
    remindEvents: sessionData.remindEvents || []
  };
}

function createSessionState() {
  return {
    sessionId: `g_${Date.now()}`,
    startTimestamp: Date.now(),
    triggered5m: false,
    triggered8m: false,
    triggered10m: false,
    remindEvents: [],
    isFinished: false,
    isAbandoned: false
  };
}

function calcDuration(startTimestamp, endTimestamp) {
  const end = endTimestamp || Date.now();
  return Math.max(0, Math.floor((end - startTimestamp) / 1000));
}

module.exports = {
  REMINDER_CONFIG,
  getStageByDuration,
  getResultTag,
  getReminderToTrigger,
  buildGuardRecord,
  createSessionState,
  calcDuration
};
