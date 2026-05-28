Page({
  handleOpenSettings() {
    wx.navigateTo({
      url: '/pages/settings/index',
      fail: () => wx.showToast({ title: '跳转失败', icon: 'none' })
    });
  },

  handleOpenBadges() {
    wx.showToast({
      title: '勋章系统将在后续版本开放',
      icon: 'none'
    });
  },

  handleOpenPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/index',
      fail: () => wx.showToast({ title: '跳转失败', icon: 'none' })
    });
  },

  handleOpenAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/index',
      fail: () => wx.showToast({ title: '跳转失败', icon: 'none' })
    });
  },

  handleOpenAbout() {
    wx.showModal({
      title: '关于肛好卫士',
      content: '肛好卫士是一款帮助用户记录如厕时长、减少无效久蹲、养成健康习惯的小程序工具。肛好，才是真的好。',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
