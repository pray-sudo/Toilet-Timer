const { getGuardRecords } = require('../../services/record-service');
const {
  calculateDailyStats,
  getDailyEvaluation,
  getDateDisplayText,
  mapRecordForList
} = require('../../utils/stats');
const { formatDate, addDays, isToday, isFutureDate } = require('../../utils/date');
const { trackEvent } = require('../../utils/track');

const HEALTH_TIPS = [
  '少蹲一会儿，肛好一点点。',
  '每一次高效撤退，都是一次健康守护。',
  '记录习惯，温柔提醒，不做医疗诊断。'
];

Page({
  data: {
    selectedDate: '',
    pageTitle: '今日战报',
    dateDisplayText: '',
    isSelectedToday: true,
    healthTip: HEALTH_TIPS[0],
    hasRecords: false,
    statCards: [],
    evaluation: {
      level: 'empty',
      title: '',
      desc: '',
      theme: 'gray'
    },
    recordList: [],
    showEmpty: true,
    emptyIcon: '📋',
    emptyTitle: '今天还没有守护记录',
    emptyDesc: '点击下方按钮，开始一次健康守护吧～',
    emptyButtonText: '开始守护',
    emptyAction: 'startGuard'
  },

  onShow() {
    if (!this.data.selectedDate) {
      this.setData({ selectedDate: formatDate(new Date()) });
    }
    this.loadReport();
  },

  loadReport() {
    const selectedDate = this.data.selectedDate || formatDate(new Date());
    const records = getGuardRecords();
    const stats = calculateDailyStats(records, selectedDate);
    const evaluation = getDailyEvaluation(stats);
    const selectedIsToday = isToday(selectedDate);

    const statCards = [
      { label: '如厕次数', value: String(stats.count), unit: '次' },
      { label: '总时长', value: stats.summary.totalDurationText, unit: '' },
      { label: '平均时长', value: stats.summary.avgDurationText, unit: '' },
      { label: '5分钟内完成率', value: stats.summary.goalRateText, unit: '' }
    ];

    const emptyState = this.buildEmptyState(selectedIsToday);

    this.setData({
      selectedDate,
      pageTitle: selectedIsToday ? '今日战报' : '历史战报',
      dateDisplayText: getDateDisplayText(selectedDate),
      isSelectedToday: selectedIsToday,
      healthTip: HEALTH_TIPS[new Date().getDate() % HEALTH_TIPS.length],
      hasRecords: stats.hasRecords,
      statCards,
      evaluation,
      recordList: stats.records.map(mapRecordForList),
      showEmpty: !stats.hasRecords,
      ...emptyState
    });

    trackEvent('report_view', {
      selectedDate,
      count: stats.count,
      goalRate: stats.goalRate
    });
  },

  buildEmptyState(selectedIsToday) {
    if (selectedIsToday) {
      return {
        emptyIcon: '🌱',
        emptyTitle: '今天还没有守护记录',
        emptyDesc: '点击下方按钮，开始一次健康守护吧～',
        emptyButtonText: '开始守护',
        emptyAction: 'startGuard'
      };
    }

    return {
      emptyIcon: '📅',
      emptyTitle: '这一天没有守护记录',
      emptyDesc: '可能是休息得很好，也可能是还没开始记录～',
      emptyButtonText: '回到今天',
      emptyAction: 'backToday'
    };
  },

  handlePrevDate() {
    const selectedDate = addDays(this.data.selectedDate, -1);
    this.setData({ selectedDate });
    this.loadReport();
    trackEvent('report_date_prev', { selectedDate });
  },

  handleNextDate() {
    if (isToday(this.data.selectedDate)) {
      wx.showToast({
        title: '未来还没有战报哦',
        icon: 'none'
      });
      return;
    }

    const nextDate = addDays(this.data.selectedDate, 1);
    if (isFutureDate(nextDate)) {
      wx.showToast({
        title: '未来还没有战报哦',
        icon: 'none'
      });
      return;
    }

    this.setData({ selectedDate: nextDate });
    this.loadReport();
    trackEvent('report_date_next', { selectedDate: nextDate });
  },

  handleBackToday() {
    this.setData({ selectedDate: formatDate(new Date()) });
    this.loadReport();
    trackEvent('report_back_today', { selectedDate: formatDate(new Date()) });
  },

  handleRecordTap(event) {
    const { sessionId } = event.detail;
    if (!sessionId) {
      return;
    }

    trackEvent('report_record_click', {
      selectedDate: this.data.selectedDate,
      sessionId
    });

    wx.navigateTo({
      url: `/pages/record-detail/index?sessionId=${sessionId}`,
      fail: () => {
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  handleEmptyAction() {
    if (this.data.emptyAction === 'startGuard') {
      trackEvent('report_empty_start_guard', { selectedDate: this.data.selectedDate });
      wx.navigateTo({
        url: '/pages/guard/index',
        fail: () => wx.showToast({ title: '跳转失败', icon: 'none' })
      });
      return;
    }

    trackEvent('report_empty_back_today', { selectedDate: this.data.selectedDate });
    this.handleBackToday();
  }
});
