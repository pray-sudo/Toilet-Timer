function padZero(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  return `${year}-${month}-${day}`;
}

function parseDateString(dateStr) {
  const parts = (dateStr || '').split('-');
  if (parts.length !== 3) {
    return new Date();
  }
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function addDays(dateStr, days) {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function compareDate(dateA, dateB) {
  const a = parseDateString(dateA).getTime();
  const b = parseDateString(dateB).getTime();
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

function isToday(dateStr) {
  return dateStr === formatDate(new Date());
}

function isYesterday(dateStr) {
  return dateStr === addDays(formatDate(new Date()), -1);
}

function isFutureDate(dateStr) {
  return compareDate(dateStr, formatDate(new Date())) > 0;
}

module.exports = {
  formatDate,
  parseDateString,
  addDays,
  compareDate,
  isToday,
  isYesterday,
  isFutureDate
};
