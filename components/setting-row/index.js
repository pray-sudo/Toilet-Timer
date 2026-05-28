Component({
  properties: {
    label: {
      type: String,
      value: ''
    },
    desc: {
      type: String,
      value: ''
    },
    checked: {
      type: Boolean,
      value: false
    },
    settingKey: {
      type: String,
      value: ''
    }
  },

  methods: {
    handleChange(event) {
      const checked = !!event.detail.value;
      this.triggerEvent('change', {
        key: this.data.settingKey,
        value: checked
      });
    }
  }
});
