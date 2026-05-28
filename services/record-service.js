const { STORAGE_KEYS, getStorage, setStorage } = require('../utils/storage');

const MAX_RECORDS = 500;
const MIN_SAVE_DURATION = 10;

function getGuardRecords() {
  const records = getStorage(STORAGE_KEYS.GUARD_RECORDS, []);
  return Array.isArray(records) ? records : [];
}

function saveGuardRecords(records) {
  const safeRecords = Array.isArray(records) ? records.slice(0, MAX_RECORDS) : [];
  return setStorage(STORAGE_KEYS.GUARD_RECORDS, safeRecords);
}

function addGuardRecord(record) {
  if (!record || record.duration < MIN_SAVE_DURATION) {
    return {
      success: false,
      message: '本次时间太短，未保存记录'
    };
  }

  const records = getGuardRecords();
  records.unshift(record);
  const saved = saveGuardRecords(records);

  if (!saved) {
    return {
      success: false,
      message: '保存失败，请稍后重试'
    };
  }

  return {
    success: true,
    record
  };
}

function getGuardRecordCount() {
  return getGuardRecords().length;
}

module.exports = {
  MAX_RECORDS,
  MIN_SAVE_DURATION,
  getGuardRecords,
  saveGuardRecords,
  addGuardRecord,
  getGuardRecordCount
};
