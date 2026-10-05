export function convertDuration(durationInSeconds: number): string {
  const minutes = Math.floor(durationInSeconds / 60);
  if (minutes < 60) {
    return `${minutes} นาที`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} ชั่วโมง ${remainingMinutes} นาที`;
}
