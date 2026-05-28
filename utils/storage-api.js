const { DEFAULT_USER_SETTINGS } = require('../config/defaults');
const { getUserSettings, saveUserSettings, initDefaultSettings } = require('../services/settings-service');
const { getGuardRecords, saveGuardRecords } = require('../services/record-service');
const { clearHealthData } = require('./data-clear');
const { getBadges, saveBadges, clearBadges } = require('./badges-storage');

module.exports = {
  DEFAULT_USER_SETTINGS,
  getUserSettings,
  saveUserSettings,
  initDefaultSettings,
  getGuardRecords,
  saveGuardRecords,
  getBadges,
  saveBadges,
  clearBadges,
  clearHealthData
};
