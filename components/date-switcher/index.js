Component({
  properties: {
    dateText: {
      type: String,
      value: ''
    },
    isToday: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    handlePrev() {
      this.triggerEvent('prev');
    },

    handleNext() {
      this.triggerEvent('next');
    },

    handleBackToday() {
      this.triggerEvent('backtoday');
    }
  }
});
