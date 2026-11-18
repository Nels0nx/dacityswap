import { mulberry32 } from '@/lib/rng';

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** A stable, obviously fake deposit address for the demo. Pure, so it is safe to call in render. */
export function demoAddress(seed: string, prefix: string, length: number): string {
  const random = mulberry32(hashString(seed));
  const alphabet = '0123456789abcdef';
  let out = prefix;
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(random() * alphabet.length)];
  return out;
}

const QR_SIZE = 25;

/** A QR-looking matrix. It encodes nothing and cannot be scanned. */
export function demoQrMatrix(seed: string): boolean[][] {
  const random = mulberry32(hashString(seed));
  const matrix = Array.from({ length: QR_SIZE }, () =>
    Array.from({ length: QR_SIZE }, () => random() > 0.52),
  );

  const finder = (top: number, left: number) => {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const row = matrix[top + y];
        if (!row || left + x < 0 || left + x >= QR_SIZE) continue;
        const edge = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
        row[left + x] = inside && (edge || core);
      }
    }
  };
  finder(0, 0);
  finder(0, QR_SIZE - 7);
  finder(QR_SIZE - 7, 0);
  return matrix;
}
