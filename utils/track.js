function trackEvent(eventName, params) {
  console.log('[track]', eventName, params || {});
}

module.exports = {
  trackEvent
};
