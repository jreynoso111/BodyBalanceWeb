import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

import {
  checkRateLimit,
  getClientIp,
  getCorsHeaders,
  getRequestOrigin,
  isAllowedOrigin,
  isAllowedRedirect,
  json,
  parseList,
  sanitizeRetryAfterSeconds,
  verifyTurnstileToken,
} from '../_shared/public-security.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const TURNSTILE_SECRET_KEY = Deno.env.get('TURNSTILE_SECRET_KEY') || '';
const PUBLIC_AUTH_ALLOWED_ORIGINS = parseList(
  Deno.env.get('PUBLIC_AUTH_ALLOWED_ORIGINS') || 'https://buddybalance.net,https://www.buddybalance.net',
);
const PUBLIC_AUTH_ALLOWED_RESET_REDIRECTS = parseList(
  Deno.env.get('PUBLIC_AUTH_ALLOWED_RESET_REDIRECTS') ||
    'https://buddybalance.net/reset-password,https://www.buddybalance.net/reset-password',
);
const TURNSTILE_ALLOWED_HOSTNAMES = parseList(
  Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES') || 'buddybalance.net,www.buddybalance.net',
);
const PUBLIC_AUTH_RATE_LIMIT_MAX = Number(Deno.env.get('PUBLIC_AUTH_RATE_LIMIT_MAX') || 5);
const PUBLIC_AUTH_RATE_LIMIT_WINDOW_MS = Number(Deno.env.get('PUBLIC_AUTH_RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function rateLimitResponse(origin: string, retryAfterMs?: number) {
  return new Response(
    JSON.stringify({ error: 'Too many attempts. Please wait a moment and try again.' }),
    {
      status: 429,
      headers: {
        ...getCorsHeaders(origin, PUBLIC_AUTH_ALLOWED_ORIGINS),
        'Content-Type': 'application/json',
        'Retry-After': sanitizeRetryAfterSeconds(retryAfterMs),
      },
    },
  );
}

Deno.serve(async (req) => {
  const origin = getRequestOrigin(req);

  if (req.method === 'OPTIONS') {
    if (!isAllowedOrigin(origin, PUBLIC_AUTH_ALLOWED_ORIGINS)) {
      return json({ error: 'Origin not allowed.' }, { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 403 });
    }

    return new Response('ok', { headers: getCorsHeaders(origin, PUBLIC_AUTH_ALLOWED_ORIGINS) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 405 });
  }

  if (!isAllowedOrigin(origin, PUBLIC_AUTH_ALLOWED_ORIGINS)) {
    return json({ error: 'Origin not allowed.' }, { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 403 });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TURNSTILE_SECRET_KEY) {
    return json(
      { error: 'Missing public auth configuration.' },
      { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 500 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const turnstileToken = String(body?.turnstileToken || '').trim();
    const remoteIp = getClientIp(req);

    if (!action || !email) {
      return json(
        { error: 'Missing required public auth fields.' },
        { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 400 },
      );
    }

    if (!turnstileToken) {
      return json(
        { error: 'Captcha verification is required.' },
        { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 400 },
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      return json({ error: 'Invalid email address.' }, { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 400 });
    }

    const rateKey = `${action}:${remoteIp || 'unknown'}:${email}`;
    const rateLimit = checkRateLimit({
      key: rateKey,
      maxAttempts: PUBLIC_AUTH_RATE_LIMIT_MAX,
      windowMs: PUBLIC_AUTH_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(origin, rateLimit.retryAfterMs);
    }

    if (action === 'send_registration_code') {
      const fullName = String(body?.fullName || '').trim();

      if (!fullName) {
        return json(
          { error: 'Full name is required.' },
          { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 400 },
        );
      }

      const turnstile = await verifyTurnstileToken({
        allowedHostnames: TURNSTILE_ALLOWED_HOSTNAMES,
        expectedAction: 'public_register',
        remoteIp,
        secretKey: TURNSTILE_SECRET_KEY,
        token: turnstileToken,
      });

      if (!turnstile.ok) {
        console.error('public-auth registration Turnstile failed:', turnstile.reason, turnstile.response);
        return json(
          { error: 'Captcha verification failed. Please try again.' },
          { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 400 },
        );
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return json({ error: error.message }, { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 400 });
      }

      return json({ ok: true, action }, { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 200 });
    }

    if (action === 'send_password_reset') {
      const redirectTo = String(body?.redirectTo || '').trim();

      if (!isAllowedRedirect(redirectTo, PUBLIC_AUTH_ALLOWED_RESET_REDIRECTS)) {
        return json(
          { error: 'Reset redirect is not allowed.' },
          { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 400 },
        );
      }

      const turnstile = await verifyTurnstileToken({
        allowedHostnames: TURNSTILE_ALLOWED_HOSTNAMES,
        expectedAction: 'public_forgot_password',
        remoteIp,
        secretKey: TURNSTILE_SECRET_KEY,
        token: turnstileToken,
      });

      if (!turnstile.ok) {
        console.error('public-auth forgot-password Turnstile failed:', turnstile.reason, turnstile.response);
        return json(
          { error: 'Captcha verification failed. Please try again.' },
          { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 400 },
        );
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        return json({ error: error.message }, { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 400 });
      }

      return json({ ok: true, action }, { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 200 });
    }

    return json({ error: 'Unsupported action.' }, { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('public-auth failure:', message);
    return json(
      { error: 'Could not process the public auth request.' },
      { allowedOrigins: PUBLIC_AUTH_ALLOWED_ORIGINS, origin, status: 500 },
    );
  }
});
