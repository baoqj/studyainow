export function sqlTimestamp(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function sqlTimestampAfter(milliseconds: number) {
  return sqlTimestamp(new Date(Date.now() + milliseconds));
}
