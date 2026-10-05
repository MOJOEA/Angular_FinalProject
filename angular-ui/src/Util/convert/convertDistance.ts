export function convertDistance(distanceInMeters: number): string {
  const kilometers = distanceInMeters / 1000;
  return `${kilometers.toFixed(2)}`;
}
