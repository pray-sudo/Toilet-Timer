Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ''
    },
    content: {
      type: String,
      value: ''
    },
    primaryText: {
      type: String,
      value: '确认'
    },
    secondaryText: {
      type: String,
      value: '取消'
    },
    primaryType: {
      type: String,
      value: 'primary'
    }
  },

  methods: {
    stopPropagation() {},

    handlePrimary() {
      this.triggerEvent('primary');
    },

    handleSecondary() {
      this.triggerEvent('secondary');
    }
  }
});
