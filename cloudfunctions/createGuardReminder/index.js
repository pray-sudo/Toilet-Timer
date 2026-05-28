const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  if (!event.sessionId || !event.remindAt) {
    return { success: false, message: '参数不完整' };
  }

  try {
    const result = await db.collection('guard_reminders').add({
      data: {
        openid: OPENID,
        sessionId: event.sessionId,
        startTime: event.startTime,
        remindAt: event.remindAt,
        remindType: event.remindType || '5m',
        page: event.page || '/pages/guard/index',
        templateId: event.templateId,
        status: 'pending',
        createdAt: db.serverDate(),
        sentAt: null,
        failReason: null
      }
    });

    return { success: true, taskId: result._id };
  } catch (err) {
    console.error('[createGuardReminder] error:', err);
    return { success: false, message: err.message };
  }
};
