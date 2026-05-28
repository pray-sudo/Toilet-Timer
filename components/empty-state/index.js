Component({
  properties: {
    icon: {
      type: String,
      value: '🌱'
    },
    title: {
      type: String,
      value: ''
    },
    desc: {
      type: String,
      value: ''
    },
    buttonText: {
      type: String,
      value: ''
    }
  },

  methods: {
    handleButtonTap() {
      this.triggerEvent('action');
    }
  }
});
