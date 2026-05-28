Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    type: {
      type: String,
      value: 'mild'
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
      value: '我知道了'
    },
    secondaryText: {
      type: String,
      value: '继续守护'
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
