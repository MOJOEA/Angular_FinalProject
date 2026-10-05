export function convertWeight(weightInKg: number): string {
  const tons = weightInKg / 1000;
  return `${tons.toFixed(2)} ตัน`;
}
