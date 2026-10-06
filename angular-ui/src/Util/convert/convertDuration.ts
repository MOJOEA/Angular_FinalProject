export function convertDuration(distanceInMeters: number): string {
  const distanceInKm = distanceInMeters / 1000;
  const totalMinutes = Math.round((distanceInKm / 30) * 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} นาที`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return `${hours} ชั่วโมง ${remainingMinutes} นาที`;
}