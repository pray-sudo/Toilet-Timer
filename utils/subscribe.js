var subscribeConfig = require('../config/subscribe');
var TEMPLATE_ID = subscribeConfig.TEMPLATE_ID_GUARD_REMINDER;
var FIELD_MAP = subscribeConfig.TEMPLATE_FIELD_MAP;
var MSG_DATA = subscribeConfig.SUBSCRIBE_MESSAGE_DATA;

var STORAGE_KEY_RUNNING_SESSION = 'ghws_running_guard_session';

function requestGuardReminderSubscribe() {
  return new Promise(function (resolve, reject) {
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: function (res) {
        var status = res[TEMPLATE_ID];
        resolve({ raw: res, status: status });
      },
      fail: function (err) {
        reject(err);
      }
    });
  });
}

/**
 * 创建提醒任务 — 提交到云函数
 * 如果项目未接入云开发，此方法仅做本地标记并打印日志。
 * 后端/云函数需实现定时发送订阅消息；前端无法在后台自行发送。
 */
function createGuardReminderTask(params) {
  var data = {
    sessionId: params.sessionId,
    startTime: params.startTime,
    remindAt: params.remindAt,
    remindType: params.remindType || '5m',
    page: '/pages/guard/index?sessionId=' + params.sessionId + '&fromSubscribe=1',
    templateId: TEMPLATE_ID
  };

  if (typeof wx.cloud !== 'undefined' && wx.cloud.callFunction) {
    return wx.cloud.callFunction({
      name: 'createGuardReminder',
      data: data
    }).then(function (res) {
      var result = res.result || {};
      if (result.success) {
        return { success: true, taskId: result.taskId || '' };
      }
      return { success: false, message: result.message || '创建失败' };
    }).catch(function (err) {
      console.error('[subscribe] createTask cloud error:', err);
      return { success: false, message: '云函数调用失败' };
    });
  }

  // 本地占位：无云函数时记录日志
  console.warn('[subscribe] 云函数未配置，提醒任务仅本地记录:', data);
  return Promise.resolve({ success: true, taskId: 'local_' + Date.now() });
}

/**
 * 取消提醒任务
 */
function cancelGuardReminderTask(sessionId) {
  if (typeof wx.cloud !== 'undefined' && wx.cloud.callFunction) {
    return wx.cloud.callFunction({
      name: 'cancelGuardReminder',
      data: { sessionId: sessionId }
    }).then(function (res) {
      return res.result || { success: true };
    }).catch(function (err) {
      console.error('[subscribe] cancelTask cloud error:', err);
      return { success: false };
    });
  }

  console.warn('[subscribe] 云函数未配置，取消任务仅本地处理:', sessionId);
  return Promise.resolve({ success: true });
}

function saveRunningSession(session) {
  try {
    wx.setStorageSync(STORAGE_KEY_RUNNING_SESSION, session);
  } catch (e) {
    console.error('[subscribe] saveRunningSession failed:', e);
  }
}

function getRunningSession() {
  try {
    return wx.getStorageSync(STORAGE_KEY_RUNNING_SESSION) || null;
  } catch (e) {
    return null;
  }
}

function clearRunningSession() {
  try {
    wx.removeStorageSync(STORAGE_KEY_RUNNING_SESSION);
  } catch (e) {
    console.error('[subscribe] clearRunningSession failed:', e);
  }
}

function formatRemindTime(timestamp) {
  var d = new Date(timestamp);
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

module.exports = {
  requestGuardReminderSubscribe: requestGuardReminderSubscribe,
  createGuardReminderTask: createGuardReminderTask,
  cancelGuardReminderTask: cancelGuardReminderTask,
  saveRunningSession: saveRunningSession,
  getRunningSession: getRunningSession,
  clearRunningSession: clearRunningSession,
  formatRemindTime: formatRemindTime,
  TEMPLATE_ID: TEMPLATE_ID
};
