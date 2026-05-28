const SOUND_PATHS = {
  mild: '/assets/sounds/mild.mp3',
  warning: '/assets/sounds/warning.mp3',
  risk: '/assets/sounds/risk.mp3'
};

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = wx.createInnerAudioContext();
    audioContext.obeyMuteSwitch = true;
  }
  return audioContext;
}

function safeVibrateShort(options) {
  try {
    wx.vibrateShort({
      type: 'medium',
      ...options,
      fail: () => {}
    });
  } catch (error) {
    console.warn('[reminder-effects] vibrateShort failed', error);
  }
}

function safeVibrateLong(options) {
  try {
    wx.vibrateLong({
      ...options,
      fail: () => {}
    });
  } catch (error) {
    console.warn('[reminder-effects] vibrateLong failed', error);
  }
}

function triggerVibration(type, vibrationEnabled) {
  if (!vibrationEnabled) {
    return;
  }

  if (type === 'mild') {
    safeVibrateShort();
    return;
  }

  if (type === 'warning') {
    safeVibrateShort();
    setTimeout(() => safeVibrateShort(), 300);
    return;
  }

  if (type === 'risk') {
    safeVibrateLong();
    setTimeout(() => safeVibrateShort(), 400);
  }
}

function playReminderSound(type, soundEnabled) {
  if (!soundEnabled) {
    return;
  }

  const src = SOUND_PATHS[type];
  if (!src) {
    return;
  }

  try {
    const audio = getAudioContext();
    audio.stop();
    audio.src = src;
    audio.play();
  } catch (error) {
    // 音频资源尚未接入时不影响主流程
    console.warn('[reminder-effects] playReminderSound skipped', type, error);
  }
}

function applyKeepScreenOn(enabled) {
  try {
    wx.setKeepScreenOn({
      keepScreenOn: !!enabled,
      fail: () => {}
    });
  } catch (error) {
    console.warn('[reminder-effects] setKeepScreenOn failed', error);
  }
}

function destroyAudioContext() {
  if (audioContext) {
    audioContext.destroy();
    audioContext = null;
  }
}

module.exports = {
  triggerVibration,
  playReminderSound,
  applyKeepScreenOn,
  destroyAudioContext
};
