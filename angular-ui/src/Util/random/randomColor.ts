const usedHues = new Set<number>();

export function getRandomColor(): string {
  let hue: number;
  let attempts = 0;

  do {
    hue = Math.floor(Math.random() * 360);
    const isClose = Array.from(usedHues).some(u => Math.abs(hue - u) < 25);
    if (!isClose || ++attempts > 30) break;
  } while (true);

  usedHues.add(hue);
  if (usedHues.size > 15) usedHues.clear();

  const l = 0.5, a = 0.9 * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
