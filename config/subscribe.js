// 微信订阅消息模板 ID
// 请在微信公众平台 -> 订阅消息 -> 公共模板库中选择模板后替换
const TEMPLATE_ID_GUARD_REMINDER = 'REPLACE_WITH_YOUR_TEMPLATE_ID';

// 订阅消息模板字段映射（需与公众平台配置的模板字段名一致）
const TEMPLATE_FIELD_MAP = {
  title: 'thing1',
  content: 'thing2',
  time: 'time3',
  remark: 'thing4'
};

// 订阅消息文案
const SUBSCRIBE_MESSAGE_DATA = {
  title: '守护提醒',
  content: '本次守护已达到建议时长',
  remark: '建议及时结束并起身活动'
};

module.exports = {
  TEMPLATE_ID_GUARD_REMINDER,
  TEMPLATE_FIELD_MAP,
  SUBSCRIBE_MESSAGE_DATA
};
