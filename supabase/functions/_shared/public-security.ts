type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export type TurnstileVerificationResponse = {
  action?: string;
  hostname?: string;
  success?: boolean;
  ['error-codes']?: string[];
};

export function parseList(raw: string) {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getRequestOrigin(req: Request) {
  const origin = req.headers.get('origin') || '';
  if (!origin) return '';

  try {
    return new URL(origin).origin;
  } catch {
    return '';
  }
}

export function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  return Boolean(origin) && allowedOrigins.includes(origin);
}

export function getCorsHeaders(origin: string, allowedOrigins: string[]) {
  const allowOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] || 'https://buddybalance.net';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

export function json(body: Record<string, unknown>, options?: {
  allowedOrigins?: string[];
  origin?: string;
  status?: number;
}) {
  const allowedOrigins = options?.allowedOrigins || [];
  const origin = options?.origin || '';
  const status = options?.status ?? 200;

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(origin, allowedOrigins),
      'Content-Type': 'application/json',
    },
  });
}

export function getClientIp(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
  return forwardedFor.split(',')[0]?.trim() || '';
}

export function checkRateLimit(options: {
  key: string;
  maxAttempts: number;
  windowMs: number;
}) {
  const now = Date.now();
  const existing = rateLimitStore.get(options.key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return { allowed: true, remaining: Math.max(options.maxAttempts - 1, 0) };
  }

  if (existing.count >= options.maxAttempts) {
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(existing.resetAt - now, 0) };
  }

  existing.count += 1;
  rateLimitStore.set(options.key, existing);
  return { allowed: true, remaining: Math.max(options.maxAttempts - existing.count, 0) };
}

export function sanitizeRetryAfterSeconds(retryAfterMs?: number) {
  if (!retryAfterMs || retryAfterMs <= 0) return '60';
  return String(Math.max(Math.ceil(retryAfterMs / 1000), 1));
}

export function isAllowedRedirect(redirectTo: string, allowedRedirects: string[]) {
  if (!redirectTo) return false;

  try {
    const normalized = new URL(redirectTo).toString();
    return allowedRedirects.some((candidate) => {
      try {
        return new URL(candidate).toString() === normalized;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export async function verifyTurnstileToken(options: {
  allowedHostnames: string[];
  expectedAction: string;
  remoteIp: string;
  secretKey: string;
  token: string;
}) {
  const payload = new URLSearchParams({
    secret: options.secretKey,
    response: options.token,
  });

  if (options.remoteIp) {
    payload.set('remoteip', options.remoteIp);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    throw new Error('Turnstile verification request failed.');
  }

  const result = (await response.json().catch(() => ({}))) as TurnstileVerificationResponse;

  if (!result.success) {
    return {
      ok: false,
      reason: 'verification_failed',
      response: result,
    };
  }

  if (result.action !== options.expectedAction) {
    return {
      ok: false,
      reason: 'action_mismatch',
      response: result,
    };
  }

  if (!result.hostname || !options.allowedHostnames.includes(result.hostname)) {
    return {
      ok: false,
      reason: 'hostname_mismatch',
      response: result,
    };
  }

  return {
    ok: true,
    response: result,
  };
}
