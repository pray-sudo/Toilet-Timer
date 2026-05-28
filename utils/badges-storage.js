const { STORAGE_KEYS, getStorage, setStorage } = require('./storage');
const { getBadgeDefinitions } = require('./badges');

function getBadges() {
  const badges = getStorage(STORAGE_KEYS.BADGES, null);
  if (!Array.isArray(badges) || !badges.length) {
    return getBadgeDefinitions();
  }
  return badges;
}

function saveBadges(badges) {
  return setStorage(STORAGE_KEYS.BADGES, badges);
}

function clearBadges() {
  return saveBadges(getBadgeDefinitions());
}

module.exports = {
  getBadges,
  saveBadges,
  clearBadges
};
