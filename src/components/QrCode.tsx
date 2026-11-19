/**
 * A small QR code encoder (byte mode, error correction level M), drawn as an SVG.
 * It follows the QR Code Model 2 standard (ISO/IEC 18004); the steps mirror Project Nayuki's
 * public-domain reference encoder. Enough for KHQR strings, which are a few hundred characters at most.
 */

// Error correction level M, indexed by version (index 0 unused).
const ECC_CODEWORDS_PER_BLOCK = [
  -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
];
const ERROR_CORRECTION_BLOCKS = [
  -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23,
  25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
];
const FORMAT_BITS_M = 0;

const bit = (value: number, index: number) => ((value >>> index) & 1) !== 0;

function rawDataModules(version: number) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alignments = Math.floor(version / 7) + 2;
    result -= (25 * alignments - 10) * alignments - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

const dataCodewords = (version: number) =>
  Math.floor(rawDataModules(version) / 8) -
  ECC_CODEWORDS_PER_BLOCK[version] * ERROR_CORRECTION_BLOCKS[version];

function gfMultiply(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number) {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]) {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coefficient, i) => (result[i] ^= gfMultiply(coefficient, factor)));
  }
  return result;
}

function alignmentPositions(version: number) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
  const result = [6];
  for (let position = version * 4 + 10; result.length < count; position -= step)
    result.splice(1, 0, position);
  return result;
}

/** Encodes text as a QR code and returns its modules, `true` for dark, as rows of columns. */
export function encodeQr(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = 1;
  for (; version <= 40; version++) {
    const countBits = version <= 9 ? 8 : 16;
    if (4 + countBits + bytes.length * 8 <= dataCodewords(version) * 8) break;
  }
  if (version > 40) throw new Error("Text is too long for a QR code.");

  // Data bits: byte mode, character count, the bytes, a terminator, then pad bytes.
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  const capacity = dataCodewords(version) * 8;
  push(0b0100, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8)
    data.push(bits.slice(i, i + 8).reduce((byte, b) => (byte << 1) | b, 0));

  // Split into blocks, add error correction to each, and interleave them.
  const blockCount = ERROR_CORRECTION_BLOCKS[version];
  const eccLength = ECC_CODEWORDS_PER_BLOCK[version];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const shortBlocks = blockCount - (rawCodewords % blockCount);
  const shortBlockLength = Math.floor(rawCodewords / blockCount);
  const divisor = reedSolomonDivisor(eccLength);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < blockCount; i++) {
    const length = shortBlockLength - eccLength + (i < shortBlocks ? 0 : 1);
    const block = data.slice(k, k + length);
    k += length;
    const ecc = reedSolomonRemainder(block, divisor);
    if (i < shortBlocks) block.push(0);
    blocks.push(block.concat(ecc));
  }
  const codewords: number[] = [];
  for (let i = 0; i < blocks[0].length; i++)
    blocks.forEach((block, j) => {
      if (i !== shortBlockLength - eccLength || j >= shortBlocks) codewords.push(block[i]);
    });

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunction = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFunction = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  // Timing patterns, finder patterns, alignment patterns.
  for (let i = 0; i < size; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ])
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size)
          setFunction(x, y, distance !== 2 && distance !== 4);
      }
  const positions = alignmentPositions(version);
  const last = positions.length - 1;
  positions.forEach((x, i) =>
    positions.forEach((y, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          setFunction(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }),
  );

  const drawFormatBits = (mask: number) => {
    const value = (FORMAT_BITS_M << 3) | mask;
    let remainder = value;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const format = ((value << 10) | remainder) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFunction(8, i, bit(format, i));
    setFunction(8, 7, bit(format, 6));
    setFunction(8, 8, bit(format, 7));
    setFunction(7, 8, bit(format, 8));
    for (let i = 9; i < 15; i++) setFunction(14 - i, 8, bit(format, i));
    for (let i = 0; i < 8; i++) setFunction(size - 1 - i, 8, bit(format, i));
    for (let i = 8; i < 15; i++) setFunction(8, size - 15 + i, bit(format, i));
    setFunction(8, size - 8, true);
  };
  drawFormatBits(0); // Reserves the format areas before the data is placed.

  if (version >= 7) {
    let remainder = version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const versionBits = (version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, bit(versionBits, i));
      setFunction(b, a, bit(versionBits, i));
    }
  }

  // Place the codewords in the zigzag order, two columns at a time from the bottom right.
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical++)
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;
        if (!isFunction[y][x] && index < codewords.length * 8) {
          modules[y][x] = bit(codewords[index >>> 3], 7 - (index & 7));
          index++;
        }
      }
  }

  const masked = (mask: number, x: number, y: number) =>
    [
      (x + y) % 2 === 0,
      y % 2 === 0,
      x % 3 === 0,
      (x + y) % 3 === 0,
      (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
      ((x * y) % 2) + ((x * y) % 3) === 0,
      (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
      (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ][mask];
  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (!isFunction[y][x] && masked(mask, x, y)) modules[y][x] = !modules[y][x];
  };
  // A simplified penalty (long runs, 2x2 blocks, dark balance) to pick a mask that scans easily.
  const penalty = () => {
    let score = 0;
    let dark = 0;
    for (let a = 0; a < size; a++) {
      let rowRun = 1;
      let columnRun = 1;
      for (let b = 1; b <= size; b++) {
        if (b < size && modules[a][b] === modules[a][b - 1]) rowRun++;
        else {
          if (rowRun >= 5) score += rowRun - 2;
          rowRun = 1;
        }
        if (b < size && modules[b][a] === modules[b - 1][a]) columnRun++;
        else {
          if (columnRun >= 5) score += columnRun - 2;
          columnRun = 1;
        }
      }
      for (let b = 0; b < size; b++) if (modules[a][b]) dark++;
    }
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const color = modules[y][x];
        if (color === modules[y][x + 1] && color === modules[y + 1][x] && color === modules[y + 1][x + 1])
          score += 3;
      }
    return score + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  };
  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask);
    drawFormatBits(mask);
    const score = penalty();
    if (score < bestScore) {
      bestMask = mask;
      bestScore = score;
    }
    applyMask(mask); // Masking twice undoes it.
  }
  applyMask(bestMask);
  drawFormatBits(bestMask);
  return modules;
}

/** Draws `value` as a QR code with a white quiet zone, scaled to fit its box. */
export function QrCode({
  value,
  className,
  label,
}: {
  value: string;
  className?: string;
  label: string;
}) {
  const modules = encodeQr(value);
  const quiet = 2;
  const size = modules.length + quiet * 2;
  let path = "";
  modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x + quiet},${y + quiet}h1v1h-1z`;
    }),
  );
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
