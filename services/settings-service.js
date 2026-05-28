const { DEFAULT_USER_SETTINGS } = require('../config/defaults');
const { normalizeCopyStyle } = require('../config/copywriting');
const { STORAGE_KEYS, getStorage, setStorage } = require('../utils/storage');

function getUserSettings() {
  const settings = getStorage(STORAGE_KEYS.USER_SETTINGS, null);
  if (!settings) {
    return { ...DEFAULT_USER_SETTINGS };
  }

  return {
    ...DEFAULT_USER_SETTINGS,
    ...settings,
    copyStyle: normalizeCopyStyle(settings.copyStyle || DEFAULT_USER_SETTINGS.copyStyle)
  };
}

function saveUserSettings(settings) {
  return setStorage(STORAGE_KEYS.USER_SETTINGS, {
    ...DEFAULT_USER_SETTINGS,
    ...settings,
    copyStyle: normalizeCopyStyle(settings.copyStyle || DEFAULT_USER_SETTINGS.copyStyle)
  });
}

function initDefaultSettings() {
  const existing = getStorage(STORAGE_KEYS.USER_SETTINGS, null);
  if (!existing) {
    saveUserSettings({ ...DEFAULT_USER_SETTINGS });
  }
}

module.exports = {
  getUserSettings,
  saveUserSettings,
  initDefaultSettings
};
