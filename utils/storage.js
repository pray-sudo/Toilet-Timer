const STORAGE_KEYS = {
  USER_SETTINGS: 'ghws_user_settings',
  GUARD_RECORDS: 'ghws_guard_records',
  BADGES: 'ghws_badges',
  ACTIVE_SESSION: 'ghws_active_session',
  APP_META: 'ghws_app_meta'
};

function getStorage(key, defaultValue) {
  try {
    const value = wx.getStorageSync(key);
    if (value === '' || value === undefined || value === null) {
      return defaultValue;
    }
    return value;
  } catch (error) {
    console.error('[storage] getStorage failed:', key, error);
    return defaultValue;
  }
}

function setStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (error) {
    console.error('[storage] setStorage failed:', key, error);
    return false;
  }
}

function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (error) {
    console.error('[storage] removeStorage failed:', key, error);
    return false;
  }
}

module.exports = {
  STORAGE_KEYS,
  getStorage,
  setStorage,
  removeStorage
};
