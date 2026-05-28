Component({
  properties: {
    duration: {
      type: Number,
      value: 0
    },
    remind5Time: {
      type: Number,
      value: 300
    },
    remind8Time: {
      type: Number,
      value: 480
    },
    remind10Time: {
      type: Number,
      value: 600
    }
  },

  data: {
    nodes: [],
    progressPercent: 0
  },

  observers: {
    'duration, remind5Time, remind8Time, remind10Time': function updateTimeline() {
      this.updateTimeline();
    }
  },

  lifetimes: {
    attached() {
      this.updateTimeline();
    }
  },

  methods: {
    updateTimeline() {
      const duration = Math.max(0, Number(this.data.duration) || 0);
      const remind5Time = Number(this.data.remind5Time) || 300;
      const remind8Time = Number(this.data.remind8Time) || 480;
      const remind10Time = Number(this.data.remind10Time) || 600;
      const maxTime = remind10Time;
      const progressPercent = Math.min(100, Math.round((duration / maxTime) * 100));

      const nodes = [
        {
          key: '5m',
          label: Math.round(remind5Time / 60) + '分钟',
          desc: '温和提醒',
          active: duration >= remind5Time,
          position: Math.round((remind5Time / maxTime) * 100)
        },
        {
          key: '8m',
          label: Math.round(remind8Time / 60) + '分钟',
          desc: '强提醒',
          active: duration >= remind8Time,
          position: Math.round((remind8Time / maxTime) * 100)
        },
        {
          key: '10m',
          label: Math.round(remind10Time / 60) + '分钟',
          desc: '风险区',
          active: duration >= remind10Time,
          position: 100
        }
      ];

      this.setData({
        nodes,
        progressPercent
      });
    }
  }
});
