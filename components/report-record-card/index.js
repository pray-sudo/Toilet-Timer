Component({
  properties: {
    sessionId: {
      type: String,
      value: ''
    },
    timeRangeText: {
      type: String,
      value: ''
    },
    durationText: {
      type: String,
      value: ''
    },
    statusLine: {
      type: String,
      value: ''
    },
    remindSummary: {
      type: String,
      value: ''
    },
    resultTag: {
      type: String,
      value: 'good'
    },
    resultLabel: {
      type: String,
      value: ''
    }
  },

  methods: {
    handleTap() {
      this.triggerEvent('tap', { sessionId: this.data.sessionId });
    }
  }
});
