function padZero(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${padZero(hours)}:${padZero(minutes)}:${padZero(remainSeconds)}`;
  }

  return `${padZero(minutes)}:${padZero(remainSeconds)}`;
}

function formatDurationText(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));

  if (safeSeconds === 0) {
    return '0分钟';
  }

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainSeconds = safeSeconds % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}小时`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}分钟`);
  }
  if (remainSeconds > 0 && hours === 0) {
    parts.push(`${remainSeconds}秒`);
  }

  return parts.join('');
}

function getDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  return `${year}-${month}-${day}`;
}

function formatDateTime(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return '--';
  }

  return `${d.getFullYear()}年${padZero(d.getMonth() + 1)}月${padZero(d.getDate())}日 ${padZero(d.getHours())}:${padZero(d.getMinutes())}`;
}

function formatTime(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) {
    return '--:--';
  }
  return `${padZero(d.getHours())}:${padZero(d.getMinutes())}`;
}

module.exports = {
  formatDuration,
  formatDurationText,
  getDateString,
  formatDateTime,
  formatTime
};
