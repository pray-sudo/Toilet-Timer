const {
  getRemindCopy,
  getResultCopy,
  getStageTip,
  normalizeCopyStyle
} = require('../../config/copywriting');
const { getUserSettings } = require('../../services/settings-service');
const { addGuardRecord } = require('../../services/record-service');
const {
  triggerVibration,
  playReminderSound,
  applyKeepScreenOn,
  destroyAudioContext
} = require('../../services/reminder-effects');
const {
  createSessionState,
  calcDuration,
  getStageByDuration,
  getReminderToTrigger,
  buildGuardRecord
} = require('../../utils/guard');
const { markReminderTriggered } = require('../../utils/reminder-state');
const { formatDuration } = require('../../utils/time');
const { trackEvent } = require('../../utils/track');
const {
  requestGuardReminderSubscribe,
  createGuardReminderTask,
  cancelGuardReminderTask,
  saveRunningSession,
  clearRunningSession,
  getRunningSession
} = require('../../utils/subscribe');

Page({
  data: {
    navBarHeight: 88,
    statusBarHeight: 20,
    navTotalHeight: 108,
    duration: 0,
    durationText: '00:00',
    stage: 'normal',
    stageText: '状态良好，保持高效～',
    theme: 'green',
    tipText: '',
    recommendedText: '≤5分钟',
    remind5Time: 300,
    remind8Time: 480,
    remind10Time: 600,
    showRemindModal: false,
    remindType: 'mild',
    remindTitle: '',
    remindContent: '',
    remindPrimaryText: '',
    remindSecondaryText: '',
    showEndConfirm: false,
    endConfirmContent: '',
    showExitConfirm: false,
    showResultModal: false,
    resultTag: 'good',
    resultTitle: '',
    resultContent: '',
    isGoalAchieved: false,
    isFinished: false,
    subscribeGuideVisible: false,
    subscribeStatus: 'none',
    subscribeLoading: false,
    subscribeStatusText: '',
    fromSubscribe: false
  },

  session: null,
  settings: null,
  tickTimer: null,

  onLoad(options) {
    this.initNavBar();
    if (options && options.targetMinutes) {
      this.targetMinutes = parseInt(options.targetMinutes, 10) || 5;
    } else {
      this.targetMinutes = 5;
    }

    if (options && options.fromSubscribe) {
      this.setData({ fromSubscribe: true });
      trackEvent('subscribe_notify_entry', { sessionId: options.sessionId || '' });
      const running = getRunningSession();
      if (!running || running.status !== 'running') {
        wx.showToast({ title: '本次守护记录可能已结束', icon: 'none' });
        setTimeout(function () {
          wx.redirectTo({ url: '/pages/report/index' });
        }, 1500);
        return;
      }
    }

    this.initSession();
  },

  onShow() {
    if (this.data.isFinished || (this.session && this.session.isAbandoned)) {
      return;
    }

    this.reloadSettings();
    this.syncDisplay();
    this.checkReminder();
    this.startTickLoop();
  },

  onHide() {
    this.stopTickLoop();
  },

  onUnload() {
    this.stopTickLoop();
    this.disableKeepScreenOn();
    destroyAudioContext();
  },

  initNavBar() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const statusBarHeight = systemInfo.statusBarHeight || 20;
      const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height;

      this.setData({
        statusBarHeight,
        navBarHeight: navBarHeight || 44,
        navTotalHeight: statusBarHeight + (navBarHeight || 44)
      });
    } catch (error) {
      console.warn('[guard] initNavBar failed', error);
    }
  },

  initSession() {
    this.reloadSettings();
    this.session = createSessionState();

    this.setData({
      tipText: getStageTip('normal', this.settings.copyStyle)
    });

    if (this.settings.keepScreenOnEnabled !== false) {
      applyKeepScreenOn(true);
    }

    trackEvent('guard_start', {
      sessionId: this.session.sessionId,
      copyStyle: normalizeCopyStyle(this.settings.copyStyle)
    });

    saveRunningSession({
      sessionId: this.session.sessionId,
      startTime: new Date(this.session.startTimestamp).toISOString(),
      startTimestamp: this.session.startTimestamp,
      status: 'running',
      subscribeReminder: null
    });

    if (this.settings.wechatReminderEnabled !== false) {
      this.setData({ subscribeGuideVisible: true });
      trackEvent('subscribe_guide_show', { sessionId: this.session.sessionId });
    }

    this.syncDisplay();
    this.startTickLoop();
  },

  reloadSettings() {
    this.settings = getUserSettings();

    const recommendedMinutes = this.targetMinutes || Math.floor((this.settings.recommendedDuration || 300) / 60);

    this.setData({
      recommendedText: `≤${recommendedMinutes}分钟`,
      remind5Time: this.settings.remind5Time || 300,
      remind8Time: this.settings.remind8Time || 480,
      remind10Time: this.settings.remind10Time || 600
    });

    if (this.settings.keepScreenOnEnabled !== false && this.session && !this.session.isFinished && !this.session.isAbandoned) {
      applyKeepScreenOn(true);
    }
  },

  startTickLoop() {
    this.stopTickLoop();
    this.tickTimer = setInterval(() => {
      if (this.data.isFinished || (this.session && this.session.isAbandoned)) {
        this.stopTickLoop();
        return;
      }
      this.syncDisplay();
      this.checkReminder();
    }, 1000);
  },

  stopTickLoop() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  },

  getCurrentDuration() {
    if (!this.session) {
      return 0;
    }
    return calcDuration(this.session.startTimestamp);
  },

  syncDisplay() {
    if (!this.session) {
      return;
    }

    const duration = this.getCurrentDuration();
    const stageInfo = getStageByDuration(duration);
    const durationText = formatDuration(duration);
    const copyStyle = normalizeCopyStyle(this.settings.copyStyle);

    const nextData = {
      duration,
      durationText,
      stage: stageInfo.stage,
      stageText: stageInfo.stageText,
      theme: stageInfo.theme,
      tipText: getStageTip(stageInfo.stage, copyStyle)
    };

    if (this.data.showEndConfirm) {
      nextData.endConfirmContent = `本次已守护 ${durationText}，确认后将保存本次记录。`;
    }

    this.setData(nextData);
  },

  checkReminder() {
    if (!this.session || this.session.isFinished || this.session.isAbandoned) {
      return;
    }

    if (this.data.showRemindModal || this.data.showEndConfirm || this.data.showExitConfirm || this.data.showResultModal) {
      return;
    }

    const duration = this.getCurrentDuration();
    const reminder = getReminderToTrigger(duration, this.settings, this.session);

    if (!reminder) {
      return;
    }

    markReminderTriggered(this.session, reminder);
    this.session.remindEvents.push({
      type: reminder.eventType,
      time: new Date().toISOString(),
      duration,
      userAction: 'show'
    });

    const remindCopy = getRemindCopy(reminder.type, this.settings.copyStyle);

    this.setData({
      showRemindModal: true,
      remindType: reminder.type,
      remindTitle: remindCopy.title,
      remindContent: remindCopy.content,
      remindPrimaryText: remindCopy.primaryText,
      remindSecondaryText: remindCopy.secondaryText
    });

    triggerVibration(reminder.type, this.settings.vibrationEnabled);
    playReminderSound(reminder.type, this.settings.soundEnabled);

    const trackMap = {
      mild: 'reminder_5m_show',
      warning: 'reminder_8m_show',
      risk: 'reminder_10m_show'
    };
    trackEvent(trackMap[reminder.type], {
      sessionId: this.session.sessionId,
      duration,
      stage: this.data.stage,
      copyStyle: normalizeCopyStyle(this.settings.copyStyle)
    });
  },

  handleBackTap() {
    if (this.data.isFinished) {
      wx.navigateBack({ delta: 1 });
      return;
    }

    this.setData({ showExitConfirm: true });
  },

  handleExitContinue() {
    this.setData({ showExitConfirm: false });
  },

  handleExitConfirm() {
    if (this.session) {
      this.session.isAbandoned = true;
    }

    this.setData({ showExitConfirm: false, isFinished: true });
    this.stopTickLoop();
    this.disableKeepScreenOn();
    this.cancelReminderIfNeeded();

    trackEvent('guard_abandon', {
      sessionId: this.session && this.session.sessionId,
      duration: this.getCurrentDuration(),
      stage: this.data.stage,
      copyStyle: normalizeCopyStyle(this.settings && this.settings.copyStyle)
    });

    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.reLaunch({ url: '/pages/home/index' });
      }
    });
  },

  handleStopTap() {
    trackEvent('guard_stop_click', {
      sessionId: this.session && this.session.sessionId,
      duration: this.getCurrentDuration(),
      stage: this.data.stage
    });

    this.setData({
      showEndConfirm: true,
      endConfirmContent: `本次已守护 ${this.data.durationText}，确认后将保存本次记录。`
    });
  },

  handleEndContinue() {
    this.setData({ showEndConfirm: false });
  },

  handleEndConfirm() {
    this.setData({ showEndConfirm: false });
    this.finishGuard();
  },

  handleRemindPrimary() {
    const { remindType } = this.data;

    if (remindType === 'mild') {
      this.appendRemindAction('confirm');
      this.setData({ showRemindModal: false });
      return;
    }

    this.appendRemindAction('stop');
    this.setData({ showRemindModal: false });
    this.handleStopTap();
  },

  handleRemindSecondary() {
    const { remindType } = this.data;

    if (remindType === 'mild') {
      this.appendRemindAction('stop');
      this.setData({ showRemindModal: false });
      this.handleStopTap();
      return;
    }

    this.appendRemindAction('continue');
    this.setData({ showRemindModal: false });
  },

  appendRemindAction(userAction) {
    if (!this.session || !this.session.remindEvents.length) {
      return;
    }

    const lastEvent = this.session.remindEvents[this.session.remindEvents.length - 1];
    lastEvent.userAction = userAction;
  },

  finishGuard() {
    if (!this.session || this.session.isFinished) {
      return;
    }

    const endTimestamp = Date.now();
    const duration = calcDuration(this.session.startTimestamp, endTimestamp);

    if (duration < 10) {
      wx.showToast({
        title: '本次时间太短，未保存记录',
        icon: 'none'
      });

      this.session.isAbandoned = true;
      this.setData({ isFinished: true });
      this.stopTickLoop();
      this.disableKeepScreenOn();
      this.cancelReminderIfNeeded();

      setTimeout(() => {
        wx.navigateBack({
          delta: 1,
          fail: () => wx.reLaunch({ url: '/pages/home/index' })
        });
      }, 1200);
      return;
    }

    const record = buildGuardRecord(this.session, endTimestamp, this.settings);
    const saveResult = addGuardRecord(record);

    if (!saveResult.success) {
      wx.showToast({
        title: saveResult.message || '保存失败，请稍后重试',
        icon: 'none'
      });
      return;
    }

    this.session.isFinished = true;
    this.stopTickLoop();
    this.disableKeepScreenOn();
    this.cancelReminderIfNeeded();

    const durationText = formatDuration(record.duration);
    const resultCopy = getResultCopy(record.resultTag, this.settings.copyStyle, durationText);

    this.setData({
      isFinished: true,
      showResultModal: true,
      resultTag: record.resultTag,
      resultTitle: resultCopy.title,
      resultContent: resultCopy.content,
      isGoalAchieved: record.isGoalAchieved
    });

    trackEvent('guard_finish', {
      sessionId: record.sessionId,
      duration: record.duration,
      stage: getStageByDuration(record.duration).stage,
      resultTag: record.resultTag,
      copyStyle: normalizeCopyStyle(this.settings.copyStyle)
    });

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  handleViewReport() {
    trackEvent('result_view_report', {
      sessionId: this.session && this.session.sessionId,
      duration: this.getCurrentDuration(),
      resultTag: this.data.resultTag
    });

    this.setData({ showResultModal: false });
    wx.redirectTo({
      url: '/pages/report/index',
      fail: () => {
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  handleBackHome() {
    trackEvent('result_back_home', {
      sessionId: this.session && this.session.sessionId,
      duration: this.getCurrentDuration(),
      resultTag: this.data.resultTag
    });

    this.setData({ showResultModal: false });
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.reLaunch({ url: '/pages/home/index' });
      }
    });
  },

  handleSubscribeEnable() {
    if (this.data.subscribeLoading) return;
    this.setData({ subscribeLoading: true });
    trackEvent('subscribe_click_enable', { sessionId: this.session && this.session.sessionId });

    var self = this;
    requestGuardReminderSubscribe().then(function (res) {
      if (res.status === 'accept') {
        trackEvent('subscribe_authorize_accept', { sessionId: self.session.sessionId });
        self.setData({ subscribeStatus: 'accepted', subscribeLoading: false });
        self.createReminderTask();
      } else if (res.status === 'reject') {
        trackEvent('subscribe_authorize_reject', { sessionId: self.session.sessionId });
        self.setData({
          subscribeStatus: 'rejected',
          subscribeGuideVisible: false,
          subscribeLoading: false,
          subscribeStatusText: '未开启微信提醒，离开小程序后可能无法及时提醒'
        });
        wx.showToast({ title: '未开启微信提醒', icon: 'none' });
      } else if (res.status === 'ban') {
        self.setData({
          subscribeStatus: 'rejected',
          subscribeGuideVisible: false,
          subscribeLoading: false,
          subscribeStatusText: '你已关闭微信提醒授权，可在微信设置中重新开启'
        });
      } else {
        self.setData({
          subscribeStatus: 'failed',
          subscribeGuideVisible: false,
          subscribeLoading: false,
          subscribeStatusText: '微信提醒模板配置异常'
        });
      }
    }).catch(function (err) {
      console.error('[guard] subscribe error:', err);
      trackEvent('subscribe_authorize_reject', { sessionId: self.session && self.session.sessionId, failReason: String(err) });
      self.setData({
        subscribeStatus: 'failed',
        subscribeGuideVisible: false,
        subscribeLoading: false,
        subscribeStatusText: '微信提醒开启失败，但小程序内提醒仍会继续'
      });
      wx.showToast({ title: '微信提醒开启失败', icon: 'none' });
    });
  },

  handleSubscribeSkip() {
    trackEvent('subscribe_click_skip', { sessionId: this.session && this.session.sessionId });
    this.setData({
      subscribeGuideVisible: false,
      subscribeStatus: 'skipped',
      subscribeStatusText: ''
    });
  },

  createReminderTask() {
    var self = this;
    var remindTime = (this.settings.remind5Time || 300) * 1000;
    var remindAt = this.session.startTimestamp + remindTime;

    createGuardReminderTask({
      sessionId: this.session.sessionId,
      startTime: new Date(this.session.startTimestamp).toISOString(),
      remindAt: remindAt,
      remindType: this.settings.wechatReminderDefaultType || '5m'
    }).then(function (res) {
      if (res.success) {
        trackEvent('subscribe_task_create_success', { sessionId: self.session.sessionId, remindAt: remindAt });
        var running = getRunningSession();
        if (running) {
          running.subscribeReminder = {
            enabled: true,
            status: 'accepted',
            remindAt: remindAt,
            remindType: '5m',
            taskId: res.taskId || ''
          };
          saveRunningSession(running);
        }
        self.setData({
          subscribeGuideVisible: false,
          subscribeStatusText: '已开启微信提醒，到点会通过微信服务通知提醒你'
        });
        wx.showToast({ title: '已开启微信提醒', icon: 'success' });
      } else {
        trackEvent('subscribe_task_create_fail', { sessionId: self.session.sessionId, failReason: res.message });
        self.setData({
          subscribeGuideVisible: false,
          subscribeStatus: 'failed',
          subscribeStatusText: '微信提醒开启失败，但小程序内提醒仍会继续'
        });
        wx.showToast({ title: '提醒任务创建失败', icon: 'none' });
      }
    });
  },

  cancelReminderIfNeeded() {
    var running = getRunningSession();
    if (running && running.subscribeReminder && running.subscribeReminder.enabled) {
      trackEvent('subscribe_task_cancel', { sessionId: running.sessionId });
      cancelGuardReminderTask(running.sessionId);
    }
    clearRunningSession();
  },

  disableKeepScreenOn() {
    applyKeepScreenOn(false);
  }
});
