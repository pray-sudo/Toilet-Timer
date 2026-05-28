const { getUserSettings, saveUserSettings } = require('../../services/settings-service');
const { clearHealthData } = require('../../utils/data-clear');
const { trackEvent } = require('../../utils/track');

Page({
  data: {
    settings: {},
    copyStyle: 'funny',
    guardMode: 'normal',
    showClearConfirm: false,
    showClearConfirmFinal: false
  },

  onShow() {
    this.loadSettings();
    trackEvent('settings_view', { fromPage: 'settings' });
  },

  loadSettings() {
    const settings = getUserSettings();
    this.setData({
      settings,
      copyStyle: settings.copyStyle === 'normal' ? 'normal' : 'funny',
      guardMode: settings.guardMode || 'normal'
    });
  },

  handleSwitchChange(event) {
    const { key, value } = event.detail;
    if (!key) {
      return;
    }

    const nextSettings = {
      ...this.data.settings,
      [key]: value
    };

    const saved = saveUserSettings(nextSettings);
    if (!saved) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      this.loadSettings();
      return;
    }

    this.setData({ settings: nextSettings });
    trackEvent('settings_change', {
      settingKey: key,
      settingValue: value,
      fromPage: 'settings'
    });
  },

  handleGuardModeChange(event) {
    const { mode } = event.currentTarget.dataset;
    if (!mode || mode === this.data.guardMode) return;

    const nextSettings = { ...this.data.settings, guardMode: mode };
    const saved = saveUserSettings(nextSettings);
    if (!saved) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      return;
    }

    this.setData({ settings: nextSettings, guardMode: mode });
    trackEvent('settings_change', { settingKey: 'guardMode', settingValue: mode, fromPage: 'settings' });
  },

  handleCopyStyleChange(event) {
    const { style } = event.currentTarget.dataset;
    if (!style || style === this.data.copyStyle) {
      return;
    }

    const nextSettings = {
      ...this.data.settings,
      copyStyle: style
    };

    const saved = saveUserSettings(nextSettings);
    if (!saved) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      return;
    }

    this.setData({
      settings: nextSettings,
      copyStyle: style
    });

    trackEvent('settings_change', {
      settingKey: 'copyStyle',
      settingValue: style,
      fromPage: 'settings'
    });
  },

  handleClearTap() {
    trackEvent('clear_data_click', { fromPage: 'settings' });
    this.setData({ showClearConfirm: true });
  },

  handleClearCancel() {
    this.setData({ showClearConfirm: false });
  },

  handleClearFirstConfirm() {
    this.setData({
      showClearConfirm: false,
      showClearConfirmFinal: true
    });
    trackEvent('clear_data_confirm', { step: 1, fromPage: 'settings' });
  },

  handleClearFinalCancel() {
    this.setData({ showClearConfirmFinal: false });
  },

  handleClearFinalConfirm() {
    const result = clearHealthData();
    this.setData({ showClearConfirmFinal: false });

    if (!result.success) {
      wx.showToast({
        title: result.message || '清空失败，请稍后重试',
        icon: 'none'
      });
      return;
    }

    trackEvent('clear_data_success', { fromPage: 'settings' });
    wx.showToast({
      title: '已清空本地数据',
      icon: 'success'
    });
  }
});
