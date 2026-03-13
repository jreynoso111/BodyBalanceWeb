import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

export async function sendPublicRegistrationCode(options: {
  email: string;
  fullName: string;
  turnstileToken?: string | null;
}) {
  if (Platform.OS !== 'web') {
    const { error } = await supabase.auth.signInWithOtp({
      email: options.email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: options.fullName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.functions.invoke('public-auth', {
    body: {
      action: 'send_registration_code',
      email: options.email,
      fullName: options.fullName,
      turnstileToken: options.turnstileToken,
    },
  });

  if (error) {
    throw new Error(error.message || 'Could not send the verification code.');
  }
}

export async function sendPublicPasswordReset(options: {
  email: string;
  redirectTo: string;
  turnstileToken?: string | null;
}) {
  if (Platform.OS !== 'web') {
    const { error } = await supabase.auth.resetPasswordForEmail(options.email, {
      redirectTo: options.redirectTo,
    });

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.functions.invoke('public-auth', {
    body: {
      action: 'send_password_reset',
      email: options.email,
      redirectTo: options.redirectTo,
      turnstileToken: options.turnstileToken,
    },
  });

  if (error) {
    throw new Error(error.message || 'Could not send the recovery email.');
  }
}
