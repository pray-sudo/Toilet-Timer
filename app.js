const { initDefaultSettings } = require('./services/settings-service');
const { seedDemoRecords } = require('./utils/seed-demo');

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      });
    }
    initDefaultSettings();
    seedDemoRecords();
  }
});
