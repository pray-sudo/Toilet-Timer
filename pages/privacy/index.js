const { trackEvent } = require('../../utils/track');

Page({
  onShow() {
    trackEvent('privacy_view', { fromPage: 'privacy' });
  }
});
