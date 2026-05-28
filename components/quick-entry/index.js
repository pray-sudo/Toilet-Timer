Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    desc: {
      type: String,
      value: ''
    },
    icon: {
      type: String,
      value: '📋'
    },
    target: {
      type: String,
      value: ''
    }
  },

  methods: {
    handleTap() {
      const { target } = this.data;
      if (!target) {
        return;
      }

      wx.navigateTo({
        url: target,
        fail: () => {
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    }
  }
});
