import {
  checkRateLimit,
  getClientIp,
  getCorsHeaders,
  getRequestOrigin,
  isAllowedOrigin,
  json,
  parseList,
  sanitizeRetryAfterSeconds,
  verifyTurnstileToken,
} from '../_shared/public-security.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPPORT_TO_EMAIL = Deno.env.get('SUPPORT_TO_EMAIL') || '';
const SUPPORT_FROM_EMAIL = Deno.env.get('SUPPORT_FROM_EMAIL') || 'no-reply@buddybalance.net';
const SUPPORT_FROM_NAME = Deno.env.get('SUPPORT_FROM_NAME') || 'Buddy Balance';
const TURNSTILE_SECRET_KEY = Deno.env.get('TURNSTILE_SECRET_KEY') || '';
const PUBLIC_CONTACT_ALLOWED_ORIGINS = parseList(
  Deno.env.get('PUBLIC_CONTACT_ALLOWED_ORIGINS') || 'https://buddybalance.net,https://www.buddybalance.net',
);
const TURNSTILE_ALLOWED_HOSTNAMES = parseList(
  Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES') || 'buddybalance.net,www.buddybalance.net',
);
const PUBLIC_CONTACT_RATE_LIMIT_MAX = Number(Deno.env.get('PUBLIC_CONTACT_RATE_LIMIT_MAX') || 5);
const PUBLIC_CONTACT_RATE_LIMIT_WINDOW_MS = Number(Deno.env.get('PUBLIC_CONTACT_RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

async function domainAcceptsEmail(domain: string) {
  const dnsHeaders = {
    Accept: 'application/dns-json',
  };

  const queryRecords = async (type: 'MX' | 'A' | 'AAAA') => {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
      headers: dnsHeaders,
    });

    if (!response.ok) {
      throw new Error(`DNS lookup failed for ${type}.`);
    }

    const payload = await response.json().catch(() => ({}));
    return Array.isArray(payload?.Answer) && payload.Answer.length > 0;
  };

  if (await queryRecords('MX').catch(() => false)) {
    return true;
  }

  if (await queryRecords('A').catch(() => false)) {
    return true;
  }

  return await queryRecords('AAAA').catch(() => false);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

Deno.serve(async (req) => {
  const origin = getRequestOrigin(req);

  if (req.method === 'OPTIONS') {
    if (!isAllowedOrigin(origin, PUBLIC_CONTACT_ALLOWED_ORIGINS)) {
      return json({ error: 'Origin not allowed.' }, { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 403 });
    }

    return new Response('ok', { headers: getCorsHeaders(origin, PUBLIC_CONTACT_ALLOWED_ORIGINS) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 405 });
  }

  if (!isAllowedOrigin(origin, PUBLIC_CONTACT_ALLOWED_ORIGINS)) {
    return json({ error: 'Origin not allowed.' }, { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 403 });
  }

  if (!RESEND_API_KEY || !SUPPORT_TO_EMAIL || !SUPPORT_FROM_EMAIL || !TURNSTILE_SECRET_KEY) {
    return json(
      { error: 'Missing public contact configuration.' },
      { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 500 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const subject = String(body?.subject || '').trim();
    const message = String(body?.message || '').trim();
    const turnstileToken = String(body?.turnstileToken || '').trim();
    const website = String(body?.website || '').trim();
    const source = String(body?.source || req.headers.get('origin') || 'unknown').trim();
    const remoteIp = getClientIp(req);

    // Honeypot field for low-effort bot submissions.
    if (website) {
      return json({ ok: true }, { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 200 });
    }

    if (!name || !email || !message) {
      return json(
        { error: 'Name, email, and message are required.' },
        { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 400 },
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      return json({ error: 'Invalid email address.' }, { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 400 });
    }

    const emailDomain = email.split('@')[1] || '';
    if (!emailDomain || !(await domainAcceptsEmail(emailDomain))) {
      return json(
        { error: 'Use a real email address with a valid mail domain.' },
        { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 400 },
      );
    }

    if (name.length > 120 || subject.length > 160 || message.length > 4000) {
      return json({ error: 'Message is too long.' }, { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 400 });
    }

    if (!turnstileToken) {
      return json(
        { error: 'Captcha verification is required.' },
        { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 400 },
      );
    }

    const rateLimit = checkRateLimit({
      key: `public_contact:${remoteIp || 'unknown'}:${email}`,
      maxAttempts: PUBLIC_CONTACT_RATE_LIMIT_MAX,
      windowMs: PUBLIC_CONTACT_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Too many attempts. Please wait a moment and try again.' }), {
        status: 429,
        headers: {
          ...getCorsHeaders(origin, PUBLIC_CONTACT_ALLOWED_ORIGINS),
          'Content-Type': 'application/json',
          'Retry-After': sanitizeRetryAfterSeconds(rateLimit.retryAfterMs),
        },
      });
    }

    const turnstileResult = await verifyTurnstileToken({
      allowedHostnames: TURNSTILE_ALLOWED_HOSTNAMES,
      expectedAction: 'public_contact',
      secretKey: TURNSTILE_SECRET_KEY,
      token: turnstileToken,
      remoteIp,
    });

    if (!turnstileResult.ok) {
      console.error('Turnstile verification failed:', turnstileResult.reason, turnstileResult.response);
      return json(
        { error: 'Captcha verification failed. Please try again.' },
        { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 400 },
      );
    }

    const supportSubject = subject || `Website contact from ${name}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 16px;">New Buddy Balance website contact</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Source:</strong> ${escapeHtml(source)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(supportSubject)}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${SUPPORT_FROM_NAME} <${SUPPORT_FROM_EMAIL}>`,
        to: [SUPPORT_TO_EMAIL],
        reply_to: email,
        subject: `[Buddy Balance] ${supportSubject}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend send failed:', errorText);
      return json(
        { error: 'Could not send the support email.' },
        { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 502 },
      );
    }

    return json({ ok: true }, { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('public-contact failure:', message);
    return json(
      { error: 'Could not process your message.' },
      { allowedOrigins: PUBLIC_CONTACT_ALLOWED_ORIGINS, origin, status: 500 },
    );
  }
});
