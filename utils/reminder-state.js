function markReminderTriggered(session, reminder) {
  if (!session || !reminder) {
    return;
  }

  session[reminder.key] = true;

  if (reminder.type === 'risk') {
    session.triggered5m = true;
    session.triggered8m = true;
    session.triggered10m = true;
    return;
  }

  if (reminder.type === 'warning') {
    session.triggered5m = true;
    session.triggered8m = true;
    return;
  }

  session.triggered5m = true;
}

module.exports = {
  markReminderTriggered
};
