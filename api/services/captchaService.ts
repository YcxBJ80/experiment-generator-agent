import crypto from 'crypto';

interface CaptchaEntry {
  answer: string;
  expiresAt: number;
}

interface CaptchaPayload {
  id: string;
  svg: string;
  expiresIn: number;
}

const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CAPTCHA_LENGTH = 5;
const store = new Map<string, CaptchaEntry>();

const randomCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64');
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt < now) {
      store.delete(id);
    }
  }
}

function buildSvg(text: string): string {
  const width = 160;
  const height = 60;
  const background = '#f7fafc';
  const textColor = '#1a202c';

  const noisePaths = Array.from({ length: 3 }).map(() => {
    const startX = Math.floor(Math.random() * width);
    const startY = Math.floor(Math.random() * height);
    const endX = Math.floor(Math.random() * width);
    const endY = Math.floor(Math.random() * height);
    const stroke = `rgba(${150 + Math.floor(Math.random() * 50)}, ${150 + Math.floor(Math.random() * 50)}, ${150 + Math.floor(Math.random() * 50)}, 0.6)`;
    return `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${stroke}" stroke-width="1.5" />`;
  }).join('');

  const letterSpacing = width / (text.length + 2);
  const characters = text.split('').map((char, index) => {
    const x = letterSpacing * (index + 1.2);
    const y = height / 2 + (Math.random() * 10 - 5);
    const rotation = Math.random() * 30 - 15;
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${textColor}" font-size="28" font-family="monospace" transform="rotate(${rotation.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">${char}</text>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${background}" rx="8" ry="8" />
    ${noisePaths}
    ${characters}
  </svg>`;

  return svg;
}

export function generateCaptcha(): CaptchaPayload {
  pruneExpired();
  const id = crypto.randomUUID();
  let text = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i += 1) {
    const idx = crypto.randomInt(0, randomCharacters.length);
    text += randomCharacters[idx];
  }

  const entry: CaptchaEntry = {
    answer: text.toUpperCase(),
    expiresAt: Date.now() + CAPTCHA_TTL_MS
  };
  store.set(id, entry);

  const svg = buildSvg(text);
  const encodedSvg = `data:image/svg+xml;base64,${base64UrlEncode(svg)}`;

  return {
    id,
    svg: encodedSvg,
    expiresIn: Math.floor(CAPTCHA_TTL_MS / 1000)
  };
}

export function verifyCaptcha(id: string | undefined, answer: string | undefined): boolean {
  if (!id || !answer) {
    return false;
  }

  pruneExpired();
  const entry = store.get(id);
  if (!entry) {
    return false;
  }

  store.delete(id);

  return entry.answer === answer.trim().toUpperCase();
}
