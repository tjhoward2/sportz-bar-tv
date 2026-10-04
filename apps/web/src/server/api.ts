/**
 * Shared helpers for route handlers: one error shape, body validation,
 * and a wrapper that turns thrown ApiErrors into JSON responses.
 *
 * Error body: { "error": { "code": "INVALID_INPUT", "message": "..." } }
 */
import type { z } from 'zod';
import { log } from './log';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const unauthorized = (message = 'Sign in required.') =>
  new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Not allowed.') => new ApiError(403, 'FORBIDDEN', message);

export function errorResponse(err: ApiError): Response {
  return Response.json(
    { error: { code: err.code, message: err.message } },
    { status: err.status, headers: { 'Cache-Control': 'no-store', ...err.headers } },
  );
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be JSON.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? `${first.path.join('.')}: ` : '';
    throw new ApiError(400, 'INVALID_INPUT', `${where}${first?.message ?? 'Invalid input.'}`);
  }
  return parsed.data;
}

/**
 * Rejects cross-site state-changing requests (CSRF defense in depth on top
 * of SameSite=Lax cookies). Requests without an Origin header (native app,
 * curl) are allowed; they can't ride a browser's cookies anyway.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  if (!origin) return;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden('Bad origin.');
  }
  if (!host || originHost !== host) throw forbidden('Cross-site request blocked.');
}

type Handler = (req: Request) => Promise<Response>;

export function route(name: string, handler: Handler): Handler {
  return async (req) => {
    try {
      return await handler(req);
    } catch (err) {
      if (err instanceof ApiError) return errorResponse(err);
      log.error('api.unhandled', {
        route: name,
        error: err instanceof Error ? err.stack : String(err),
      });
      return errorResponse(new ApiError(500, 'INTERNAL', 'Something went wrong.'));
    }
  };
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  return Response.json(body, { ...init, headers });
}
