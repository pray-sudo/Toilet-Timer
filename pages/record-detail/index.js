const { getGuardRecords } = require('../../services/record-service');
const { findRecordBySessionId, getRecordDetailView } = require('../../utils/stats');
const { trackEvent } = require('../../utils/track');

Page({
  data: {
    loaded: false,
    notFound: false,
    detail: null
  },

  onLoad(options) {
    const sessionId = options && options.sessionId;
    this.loadDetail(sessionId);
  },

  loadDetail(sessionId) {
    if (!sessionId) {
      this.setData({ loaded: true, notFound: true, detail: null });
      return;
    }

    const record = findRecordBySessionId(getGuardRecords(), sessionId);
    if (!record) {
      this.setData({ loaded: true, notFound: true, detail: null });
      return;
    }

    const detail = getRecordDetailView(record);
    this.setData({
      loaded: true,
      notFound: false,
      detail
    });

    trackEvent('record_detail_view', {
      sessionId,
      resultTag: detail.resultTag
    });
  },

  handleBackReport() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.reLaunch({ url: '/pages/home/index' });
      }
    });
  }
});
