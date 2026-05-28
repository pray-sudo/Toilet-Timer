Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    resultTag: {
      type: String,
      value: 'good'
    },
    title: {
      type: String,
      value: ''
    },
    content: {
      type: String,
      value: ''
    },
    isGoalAchieved: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    stopPropagation() {},

    handleViewReport() {
      this.triggerEvent('viewreport');
    },

    handleBackHome() {
      this.triggerEvent('backhome');
    }
  }
});
