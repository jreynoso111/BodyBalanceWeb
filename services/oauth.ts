import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthStatus = 'success' | 'redirect' | 'canceled' | 'error';

export interface GoogleAuthResult {
  status: GoogleAuthStatus;
  message?: string;
}

function mapGoogleOAuthError(rawMessage?: string): string {
  const message = (rawMessage || '').trim();
  const normalized = message.toLowerCase();

  if (normalized.includes('provider is not enabled') || normalized.includes('unsupported provider')) {
    return 'Google sign-in is not enabled in Supabase yet. Enable Google in Auth Providers and add a valid Google Client ID/Secret.';
  }

  if (normalized.includes('invalid redirect') || normalized.includes('redirect_uri_mismatch')) {
    return 'Google sign-in redirect URL is not configured correctly. Verify your Supabase Auth redirect URLs and Google OAuth redirect URIs.';
  }

  if (normalized.includes('invalid client') || normalized.includes('client id')) {
    return 'Google OAuth client configuration is invalid. Verify the Google Client ID and Client Secret in Supabase Auth Providers.';
  }

  return message || 'Google sign in failed. Please try again.';
}

function readParam(url: string, key: string): string | null {
  try {
    const parsed = new URL(url);
    const queryValue = parsed.searchParams.get(key);
    if (queryValue) return queryValue;

    const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
    if (!hash) return null;
    const hashParams = new URLSearchParams(hash);
    return hashParams.get(key);
  } catch {
    return null;
  }
}

export async function completeOAuthFromUrl(url: string): Promise<GoogleAuthResult> {
  const code = readParam(url, 'code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { status: 'error', message: mapGoogleOAuthError(error.message) };
    }
    return { status: 'success' };
  }

  const accessToken = readParam(url, 'access_token');
  const refreshToken = readParam(url, 'refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      return { status: 'error', message: mapGoogleOAuthError(error.message) };
    }
    return { status: 'success' };
  }

  const oauthError = readParam(url, 'error_description') || readParam(url, 'error');
  if (oauthError) {
    return { status: 'error', message: mapGoogleOAuthError(oauthError) };
  }

  return { status: 'error', message: 'Could not complete Google authentication.' };
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  const redirectTo = Linking.createURL('/auth/callback');

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      return { status: 'error', message: mapGoogleOAuthError(error.message) };
    }

    return { status: 'redirect' };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    return { status: 'error', message: mapGoogleOAuthError(error.message) };
  }

  if (!data?.url) {
    return { status: 'error', message: 'Could not start Google authentication.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    return { status: 'canceled', message: 'Google sign in was canceled.' };
  }

  return completeOAuthFromUrl(result.url);
}
