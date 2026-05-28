const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  if (!event.sessionId) {
    return { success: false, message: '缺少 sessionId' };
  }

  try {
    const result = await db.collection('guard_reminders')
      .where({
        openid: OPENID,
        sessionId: event.sessionId,
        status: 'pending'
      })
      .update({
        data: {
          status: 'cancelled',
          cancelledAt: db.serverDate()
        }
      });

    return { success: true, updated: result.stats.updated };
  } catch (err) {
    console.error('[cancelGuardReminder] error:', err);
    return { success: false, message: err.message };
  }
};
