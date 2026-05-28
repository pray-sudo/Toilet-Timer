const { getUserSettings, saveUserSettings } = require('../../services/settings-service');

Page({
  data: {
    statusBarHeight: 20,
    showTimePicker: false,
    selectedMinutes: 5,
    guardMode: 'toilet_dispatch_game'
  },

  onLoad() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      this.setData({ statusBarHeight: systemInfo.statusBarHeight || 20 });
    } catch (error) {
      console.warn('[home] getSystemInfo failed', error);
    }
  },

  onShow() {
    const settings = getUserSettings();
    this.setData({
      guardMode: settings.guardMode || 'toilet_dispatch_game',
      selectedMinutes: settings.defaultTargetMinutes || 5
    });
  },

  handleStartGuard() {
    this.setData({ showTimePicker: true });
  },

  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode) this.setData({ guardMode: mode });
  },

  selectTime(e) {
    const minutes = Number(e.currentTarget.dataset.minutes);
    this.setData({ selectedMinutes: minutes });
  },

  hideTimePicker() {
    this.setData({ showTimePicker: false });
  },

  noop() {},

  confirmTimePicker() {
    const minutes = this.data.selectedMinutes;
    const mode = this.data.guardMode;
    this.setData({ showTimePicker: false });

    const settings = getUserSettings();
    if (settings.guardMode !== mode || settings.defaultTargetMinutes !== minutes) {
      saveUserSettings(Object.assign({}, settings, { guardMode: mode, defaultTargetMinutes: minutes }));
    }

    if (mode === 'toilet_dispatch_game') {
      wx.navigateTo({
        url: `/pages/game/index?targetMinutes=${minutes}`,
        fail: () => wx.showToast({ title: '跳转失败，请稍后重试', icon: 'none' })
      });
    } else {
      wx.navigateTo({
        url: `/pages/guard/index?targetMinutes=${minutes}`,
        fail: () => wx.showToast({ title: '跳转失败，请稍后重试', icon: 'none' })
      });
    }
  },

  goReport() {
    wx.navigateTo({ url: '/pages/report/index', fail: () => wx.showToast({ title: '跳转失败', icon: 'none' }) });
  },
  goTrend() {
    wx.navigateTo({ url: '/pages/trend/index', fail: () => wx.showToast({ title: '跳转失败', icon: 'none' }) });
  },
  goProfile() {
    wx.navigateTo({ url: '/pages/profile/index', fail: () => wx.showToast({ title: '跳转失败', icon: 'none' }) });
  }
});
