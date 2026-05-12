export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) {
    return '';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = value >= 10 || unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

export function formatBp(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(value)));
}

export function formatResolution(bp: number | undefined): string {
  if (bp === undefined || !Number.isFinite(bp)) {
    return '';
  }

  if (bp >= 1_000_000) {
    return `${formatScaled(bp, 1_000_000)} Mb`;
  }
  if (bp >= 1_000) {
    return `${formatScaled(bp, 1_000)} kb`;
  }
  return `${formatBp(bp)} bp`;
}

function formatScaled(value: number, divisor: number): string {
  const scaled = value / divisor;
  const rounded = scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(rounded);
}

