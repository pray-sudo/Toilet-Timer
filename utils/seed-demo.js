const { STORAGE_KEYS, setStorage, getStorage } = require('./storage');
const { getDateString } = require('./time');

function dayMs(n) {
  return n * 86400000;
}

function makeRecord(id, dayOffset, hour, minute, duration, opts) {
  var now = new Date();
  var base = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset, hour, minute);
  var end = new Date(base.getTime() + duration * 1000);
  var date = getDateString(base);
  var resultTag = 'excellent';
  if (duration >= 600) resultTag = 'risk';
  else if (duration >= 480) resultTag = 'overtime';
  else if (duration >= 300) resultTag = 'good';

  return Object.assign({
    sessionId: 'mock_' + id,
    startTime: base.toISOString(),
    endTime: end.toISOString(),
    duration: duration,
    date: date,
    resultTag: resultTag,
    isGoalAchieved: duration < 300,
    triggered5m: duration >= 300,
    triggered8m: duration >= 480,
    triggered10m: duration >= 600,
    remindEvents: []
  }, opts || {});
}

function seedDemoRecords(force) {
  var existing = getStorage(STORAGE_KEYS.GUARD_RECORDS);
  if (!force && Array.isArray(existing) && existing.length > 0) {
    return;
  }

  var records = [
    makeRecord('t1', 0, 7, 30, 180),
    makeRecord('t2', 0, 12, 15, 260),
    makeRecord('t3', 0, 19, 0, 350, {
      remindEvents: [{ type: '5m', duration: 300, userAction: 'stop' }]
    }),

    makeRecord('y1', 1, 8, 0, 240),
    makeRecord('y2', 1, 13, 30, 540, {
      remindEvents: [
        { type: '5m', duration: 300, userAction: 'continue' },
        { type: '8m', duration: 480, userAction: 'stop' }
      ]
    }),

    makeRecord('d2a', 2, 7, 45, 200),
    makeRecord('d2b', 2, 12, 0, 290),
    makeRecord('d2c', 2, 20, 30, 660, {
      remindEvents: [
        { type: '5m', duration: 300, userAction: 'continue' },
        { type: '8m', duration: 480, userAction: 'continue' },
        { type: '10m', duration: 600, userAction: 'stop' }
      ]
    }),

    makeRecord('d3a', 3, 8, 30, 270),
    makeRecord('d3b', 3, 18, 0, 320, {
      remindEvents: [{ type: '5m', duration: 300, userAction: 'confirm' }]
    }),

    makeRecord('d4a', 4, 9, 0, 150),
    makeRecord('d4b', 4, 13, 0, 220),
    makeRecord('d4c', 4, 19, 30, 280),

    makeRecord('d5a', 5, 8, 0, 190),
    makeRecord('d5b', 5, 17, 30, 480, {
      remindEvents: [
        { type: '5m', duration: 300, userAction: 'continue' },
        { type: '8m', duration: 480, userAction: 'stop' }
      ]
    }),

    makeRecord('d6a', 6, 7, 30, 230),
    makeRecord('d6b', 6, 12, 45, 260),

    makeRecord('g1', 0, 8, 45, 295, {
      mode: 'toilet_dispatch_game', targetSeconds: 300,
      gameResult: { servedUsers: 10, missedUsers: 0, cleanedStalls: 6, refilledPaper: 3, fixedStalls: 1, clearedTrash: 2, maxQueueLength: 4 }
    }),
    makeRecord('g2', 1, 14, 0, 310, {
      mode: 'toilet_dispatch_game', targetSeconds: 300,
      gameResult: { servedUsers: 12, missedUsers: 1, cleanedStalls: 7, refilledPaper: 5, fixedStalls: 2, clearedTrash: 3, maxQueueLength: 5 }
    }),
    makeRecord('g3', 3, 9, 15, 178, {
      mode: 'toilet_dispatch_game', targetSeconds: 180,
      gameResult: { servedUsers: 5, missedUsers: 0, cleanedStalls: 3, refilledPaper: 2, fixedStalls: 0, clearedTrash: 1, maxQueueLength: 3 }
    }),
  ];

  setStorage(STORAGE_KEYS.GUARD_RECORDS, records);
  console.log('[seed] demo records written:', records.length);
}

module.exports = {
  seedDemoRecords
};
