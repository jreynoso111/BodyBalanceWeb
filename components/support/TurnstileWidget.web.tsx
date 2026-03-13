import React, { useEffect, useMemo, useRef, useState } from 'react';

type TurnstileWidgetProps = {
  action?: string;
  onTokenChange: (token: string | null) => void;
  resetNonce?: number;
  siteKey: string;
  theme?: 'light' | 'dark' | 'auto';
};

type TurnstileRenderOptions = {
  action?: string;
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  'timeout-callback': () => void;
};

type TurnstileApi = {
  remove: (widgetId: string) => void;
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
};

declare global {
  interface Window {
    __buddyBalanceTurnstileLoader?: Promise<void>;
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function ensureTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile requires a browser environment.'));
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (window.__buddyBalanceTurnstileLoader) {
    return window.__buddyBalanceTurnstileLoader;
  }

  window.__buddyBalanceTurnstileLoader = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.turnstile || existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Could not load Turnstile.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Could not load Turnstile.'));
    document.head.appendChild(script);
  }).finally(() => {
    if (!window.turnstile) {
      window.__buddyBalanceTurnstileLoader = undefined;
    }
  });

  return window.__buddyBalanceTurnstileLoader;
}

export function TurnstileWidget({
  action = 'public_contact',
  onTokenChange,
  resetNonce = 0,
  siteKey,
  theme = 'light',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [statusText, setStatusText] = useState('Loading bot check...');
  const elementId = useMemo(() => `turnstile-${Math.random().toString(36).slice(2, 10)}`, []);

  useEffect(() => {
    let disposed = false;

    const mountWidget = async () => {
      onTokenChange(null);

      if (!siteKey.trim()) {
        setStatusText('Turnstile site key is missing.');
        return;
      }

      setStatusText('Loading bot check...');

      try {
        await ensureTurnstileScript();

        if (disposed || !containerRef.current || !window.turnstile) {
          return;
        }

        containerRef.current.innerHTML = '';

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          callback: (token) => {
            if (disposed) return;
            setStatusText('');
            onTokenChange(token);
          },
          'expired-callback': () => {
            if (disposed) return;
            onTokenChange(null);
            setStatusText('Verification expired. Complete the bot check again.');
          },
          'timeout-callback': () => {
            if (disposed) return;
            onTokenChange(null);
            setStatusText('Verification timed out. Complete the bot check again.');
          },
          'error-callback': () => {
            if (disposed) return;
            onTokenChange(null);
            setStatusText('Turnstile could not verify the request. Refresh and try again.');
          },
        });
      } catch {
        if (disposed) return;
        onTokenChange(null);
        setStatusText('Turnstile could not load. Refresh and try again.');
      }
    };

    void mountWidget();

    return () => {
      disposed = true;
      onTokenChange(null);

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [action, onTokenChange, resetNonce, siteKey, theme]);

  return (
    <div style={styles.wrapper}>
      <div id={elementId} ref={containerRef} />
      {statusText ? <p style={styles.statusText}>{statusText}</p> : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  statusText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: '18px',
    margin: 0,
  },
};
