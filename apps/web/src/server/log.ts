/**
 * Minimal structured logger. One JSON object per line so Vercel's log
 * search can filter on fields. Never log secrets or personal data.
 */

type Level = 'info' | 'warn' | 'error';

function write(level: Level, msg: string, fields?: Record<string, unknown>): void {
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  // eslint-disable-next-line no-console -- the logger is the one place info goes to stdout
  else console.log(line);
}

export const log = {
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields),
};
