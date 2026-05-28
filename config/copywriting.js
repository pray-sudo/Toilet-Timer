const STAGE_TIPS = {
  funny: {
    normal: '加油，马上就能达成"速战速决"成就啦！',
    target: '目标已达成，今天的效率很可以～',
    warning: '时间有点久，静脉压力开始加班了',
    risk: '警报！已经进入"痔"风险区域，建议立即起身'
  },
  normal: {
    normal: '建议如厕时间控制在 5 分钟以内',
    target: '已达到推荐时长，建议尽快结束',
    warning: '当前时长偏长，请尽快结束',
    risk: '当前时长过长，建议立即起身活动'
  }
};

const REMIND_COPY = {
  funny: {
    mild: {
      title: '目标达成，效率真高！',
      content: '可以考虑撤退啦～',
      primaryText: '我知道了',
      secondaryText: '结束守护'
    },
    warning: {
      title: '时间有点久了',
      content: '静脉压力开始加班啦，建议尽快结束',
      primaryText: '立即起身',
      secondaryText: '继续守护'
    },
    risk: {
      title: '进入"痔"风险区域',
      content: '当前时长已经偏长，建议立即起身活动',
      primaryText: '立即起身',
      secondaryText: '继续守护'
    }
  },
  normal: {
    mild: {
      title: '已达到推荐时长',
      content: '建议尽快结束，避免久坐久蹲',
      primaryText: '我知道了',
      secondaryText: '结束守护'
    },
    warning: {
      title: '当前时长偏长',
      content: '请尽快结束，减少静脉压力',
      primaryText: '立即起身',
      secondaryText: '继续守护'
    },
    risk: {
      title: '时长过长提醒',
      content: '当前时长已进入风险区间，建议立即起身',
      primaryText: '立即起身',
      secondaryText: '继续守护'
    }
  }
};

const RESULT_COPY = {
  funny: {
    excellent: {
      title: '速战速决，优秀！',
      content: '本次用时 {durationText}，效率很高，继续保持～'
    },
    good: {
      title: '目标达成，表现不错！',
      content: '本次用时 {durationText}，已经完成一次健康守护'
    },
    overtime: {
      title: '这次稍微久了一点',
      content: '本次用时 {durationText}，下次争取控制在 5 分钟内'
    },
    risk: {
      title: '本次时间偏长',
      content: '本次用时 {durationText}，建议下次减少久坐久蹲时间'
    }
  },
  normal: {
    excellent: {
      title: '表现优秀',
      content: '本次用时 {durationText}，时长控制良好'
    },
    good: {
      title: '目标达成',
      content: '本次用时 {durationText}，已完成一次健康守护'
    },
    overtime: {
      title: '时长偏长',
      content: '本次用时 {durationText}，建议下次控制在 5 分钟内'
    },
    risk: {
      title: '时长过长',
      content: '本次用时 {durationText}，建议减少久坐久蹲时间'
    }
  }
};

const RESULT_TAG_LABELS = {
  excellent: '优秀',
  good: '达标',
  overtime: '偏久',
  risk: '风险'
};

function normalizeCopyStyle(copyStyle) {
  if (copyStyle === 'humor' || copyStyle === 'funny') {
    return 'funny';
  }
  return 'normal';
}

function getStageTip(stage, copyStyle) {
  const style = normalizeCopyStyle(copyStyle);
  return STAGE_TIPS[style][stage] || STAGE_TIPS.normal[stage];
}

function getRemindCopy(type, copyStyle) {
  const style = normalizeCopyStyle(copyStyle);
  return REMIND_COPY[style][type] || REMIND_COPY.normal[type];
}

function getResultCopy(resultTag, copyStyle, durationText) {
  const style = normalizeCopyStyle(copyStyle);
  const copy = RESULT_COPY[style][resultTag] || RESULT_COPY.normal[resultTag];
  return {
    title: copy.title,
    content: copy.content.replace('{durationText}', durationText)
  };
}

module.exports = {
  RESULT_TAG_LABELS,
  normalizeCopyStyle,
  getStageTip,
  getRemindCopy,
  getResultCopy
};
