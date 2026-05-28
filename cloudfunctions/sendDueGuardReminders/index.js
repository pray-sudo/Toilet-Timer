const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 模板字段映射 — 需与微信公众平台配置的模板字段名一致
const FIELD_MAP = {
  title: 'thing1',
  content: 'thing2',
  time: 'time3',
  remark: 'thing4'
};

function formatTime(ts) {
  const d = new Date(ts);
  const pad = n => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

exports.main = async (event, context) => {
  const now = Date.now();
  let tasks;

  try {
    const res = await db.collection('guard_reminders')
      .where({
        status: 'pending',
        remindAt: _.lte(now)
      })
      .limit(50)
      .get();
    tasks = res.data || [];
  } catch (err) {
    console.error('[sendDue] query error:', err);
    return { success: false, message: err.message };
  }

  if (!tasks.length) {
    return { success: true, sent: 0, message: '无到期任务' };
  }

  let sentCount = 0;
  let failCount = 0;

  for (const task of tasks) {
    const data = {};
    data[FIELD_MAP.title] = { value: '守护提醒' };
    data[FIELD_MAP.content] = { value: '本次守护已达到建议时长' };
    data[FIELD_MAP.time] = { value: formatTime(task.remindAt) };
    data[FIELD_MAP.remark] = { value: '建议及时结束并起身活动' };

    try {
      await cloud.openapi.subscribeMessage.send({
        touser: task.openid,
        templateId: task.templateId,
        page: task.page,
        data: data
      });

      await db.collection('guard_reminders').doc(task._id).update({
        data: { status: 'sent', sentAt: db.serverDate() }
      });
      sentCount++;
    } catch (err) {
      console.error('[sendDue] send failed for', task._id, err);
      await db.collection('guard_reminders').doc(task._id).update({
        data: { status: 'failed', failReason: String(err.message || err) }
      }).catch(() => {});
      failCount++;
    }
  }

  return { success: true, sent: sentCount, failed: failCount };
};
