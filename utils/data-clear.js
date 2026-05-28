const { STORAGE_KEYS, getStorage, setStorage, removeStorage } = require('./storage');
const { getBadgeDefinitions } = require('./badges');

function clearHealthData() {
  try {
    setStorage(STORAGE_KEYS.GUARD_RECORDS, []);
    setStorage(STORAGE_KEYS.BADGES, getBadgeDefinitions());
    removeStorage(STORAGE_KEYS.ACTIVE_SESSION);
    return { success: true };
  } catch (error) {
    console.error('[data-clear] clearHealthData failed', error);
    return { success: false, message: '清空失败，请稍后重试' };
  }
}

module.exports = {
  clearHealthData
};
