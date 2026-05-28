const { trackEvent } = require('../../utils/track');

Page({
  onShow() {
    trackEvent('agreement_view', { fromPage: 'agreement' });
  }
});
