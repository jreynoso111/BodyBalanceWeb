import { User } from '@supabase/supabase-js';

import { AppLanguage, getDeviceLanguage, normalizeLanguage } from '@/constants/i18n';
import { isMissingAvatarUrlColumn } from '@/services/profileAvatar';
import { normalizePlanTier, PlanTier } from '@/services/subscriptionPlan';
import { supabase } from '@/services/supabase';

const isMissingDefaultLanguageColumn = (message?: string) =>
  String(message || '').toLowerCase().includes('default_language');
const isMissingFriendCodeColumn = (message?: string) =>
  String(message || '').toLowerCase().includes('friend_code');
const isMissingPremiumMetadataColumn = (message?: string) => {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('last_premium_granted_at') || normalized.includes('last_premium_granted_source');
};

const normalizeRole = (role?: string | null) => {
  const normalized = String(role || '').toLowerCase().trim();
  if (normalized === 'administrator') return 'admin';
  if (normalized) return normalized;
  return 'user';
};

export type ProfileMeta = {
  normalizedRole: string;
  planTier: PlanTier;
  language: AppLanguage;
};

export type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
  currencyDefault: string;
  defaultLanguage: AppLanguage;
  avatarPath: string | null;
  friendCode: string;
  friendCodeStatus: 'ready' | 'missing';
  planTier: PlanTier;
  premiumReferralExpiresAt: string | null;
};

export type MembershipDetails = {
  planTier: PlanTier;
  grantedAt: string | null;
  grantedSource: 'referral' | 'purchase' | 'admin' | null;
  premiumReferralExpiresAt: string | null;
};

export type UpdateUserProfilePayload = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  currency_default: string;
  default_language: AppLanguage;
  avatar_url: string | null;
  updated_at: string;
};

export type UpdateUserProfileResult = {
  languageSavedWithFallback: boolean;
  avatarSavedWithFallback: boolean;
};

export type UpdateProfileDefaultsPayload = {
  currency_default: string;
  default_language: AppLanguage;
  updated_at: string;
};

export type UpdateProfileDefaultsResult = {
  languageSavedWithFallback: boolean;
};

export async function fetchProfileMeta(userId: string): Promise<ProfileMeta> {
  let { data, error } = await supabase
    .from('profiles')
    .select('role, default_language, plan_tier, premium_referral_expires_at')
    .eq('id', userId)
    .maybeSingle();

  if (error && isMissingDefaultLanguageColumn(error.message)) {
    const fallback = await supabase
      .from('profiles')
      .select('role, plan_tier, premium_referral_expires_at')
      .eq('id', userId)
      .single();
    data = fallback.data as any;
    error = fallback.error as any;
  }

  if (error) {
    throw new Error(error.message);
  }

  return {
    normalizedRole: normalizeRole((data as any)?.role),
    planTier: normalizePlanTier((data as any)?.plan_tier, (data as any)?.premium_referral_expires_at),
    language: normalizeLanguage((data as any)?.default_language, getDeviceLanguage()),
  };
}

export async function fetchMyProfile(user: User): Promise<UserProfile> {
  const fullFields =
    'full_name, email, phone, currency_default, default_language, avatar_url, friend_code, plan_tier, premium_referral_expires_at';
  let { data, error } = await supabase.from('profiles').select(fullFields).eq('id', user.id).maybeSingle();

  if (
    error &&
    (isMissingDefaultLanguageColumn(error.message) ||
      isMissingAvatarUrlColumn(error.message) ||
      isMissingFriendCodeColumn(error.message))
  ) {
    const fallbackFields = [
      'full_name',
      'email',
      'phone',
      'currency_default',
      'plan_tier',
      'premium_referral_expires_at',
      ...(isMissingDefaultLanguageColumn(error.message) ? [] : ['default_language']),
      ...(isMissingAvatarUrlColumn(error.message) ? [] : ['avatar_url']),
      ...(isMissingFriendCodeColumn(error.message) ? [] : ['friend_code']),
    ].join(', ');

    const fallback = await supabase.from('profiles').select(fallbackFields).eq('id', user.id).maybeSingle();

    data = fallback.data as any;
    error = fallback.error as any;
  }

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const { data: upserted, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: String(user.user_metadata?.full_name || '').trim() || null,
          email: user.email || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select(fullFields)
      .maybeSingle();

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    data = upserted as any;
  }

  let resolvedFriendCode = String((data as any)?.friend_code || '').trim();
  if (!resolvedFriendCode) {
    const { data: ensuredCode, error: ensureError } = await supabase.rpc('ensure_my_friend_code');
    if (ensureError) {
      console.error('friend code ensure failed:', ensureError.message);
    } else {
      resolvedFriendCode = String(ensuredCode || '').trim();
    }
  }

  return {
    fullName: data?.full_name || String(user.user_metadata?.full_name || '').trim() || '',
    email: data?.email || user.email || '',
    phone: data?.phone || '',
    currencyDefault: data?.currency_default || 'USD',
    defaultLanguage: normalizeLanguage((data as any)?.default_language, getDeviceLanguage()),
    avatarPath: (data as any)?.avatar_url || null,
    friendCode: resolvedFriendCode,
    friendCodeStatus: resolvedFriendCode ? 'ready' : 'missing',
    planTier: normalizePlanTier((data as any)?.plan_tier, (data as any)?.premium_referral_expires_at),
    premiumReferralExpiresAt: (data as any)?.premium_referral_expires_at || null,
  };
}

export async function fetchMyMembershipDetails(userId: string): Promise<MembershipDetails> {
  let { data, error } = await supabase
    .from('profiles')
    .select('plan_tier, premium_referral_expires_at, last_premium_granted_at, last_premium_granted_source')
    .eq('id', userId)
    .maybeSingle();

  if (error && isMissingPremiumMetadataColumn(error.message)) {
    const fallback = await supabase
      .from('profiles')
      .select('plan_tier, premium_referral_expires_at')
      .eq('id', userId)
      .maybeSingle();
    data = fallback.data as any;
    error = fallback.error as any;
  }

  if (error) {
    throw new Error(error.message);
  }

  const rawSource = String((data as any)?.last_premium_granted_source || '').trim().toLowerCase();
  const grantedSource =
    rawSource === 'referral' || rawSource === 'purchase' || rawSource === 'admin'
      ? rawSource
      : null;

  return {
    planTier: normalizePlanTier((data as any)?.plan_tier, (data as any)?.premium_referral_expires_at),
    grantedAt: (data as any)?.last_premium_granted_at || null,
    grantedSource,
    premiumReferralExpiresAt: (data as any)?.premium_referral_expires_at || null,
  };
}

export async function updateMyProfile(
  userId: string,
  patch: UpdateUserProfilePayload
): Promise<UpdateUserProfileResult> {
  let languageSavedWithFallback = false;
  let avatarSavedWithFallback = false;

  let { error } = await supabase.from('profiles').update(patch).eq('id', userId);

  if (error && (isMissingDefaultLanguageColumn(error.message) || isMissingAvatarUrlColumn(error.message))) {
    languageSavedWithFallback = isMissingDefaultLanguageColumn(error.message);
    avatarSavedWithFallback = isMissingAvatarUrlColumn(error.message);

    const fallbackPatch = { ...patch };
    if (languageSavedWithFallback) {
      delete (fallbackPatch as Partial<UpdateUserProfilePayload>).default_language;
    }
    if (avatarSavedWithFallback) {
      delete (fallbackPatch as Partial<UpdateUserProfilePayload>).avatar_url;
    }

    const fallback = await supabase.from('profiles').update(fallbackPatch).eq('id', userId);
    error = fallback.error as any;
  }

  if (error) {
    throw new Error(error.message);
  }

  return {
    languageSavedWithFallback,
    avatarSavedWithFallback,
  };
}

export async function updateMyProfileDefaults(
  userId: string,
  patch: UpdateProfileDefaultsPayload
): Promise<UpdateProfileDefaultsResult> {
  let languageSavedWithFallback = false;

  let { error } = await supabase.from('profiles').update(patch).eq('id', userId);

  if (error && isMissingDefaultLanguageColumn(error.message)) {
    languageSavedWithFallback = true;

    const fallbackPatch = { ...patch };
    delete (fallbackPatch as Partial<UpdateProfileDefaultsPayload>).default_language;

    const fallback = await supabase.from('profiles').update(fallbackPatch).eq('id', userId);
    error = fallback.error as any;
  }

  if (error) {
    throw new Error(error.message);
  }

  return {
    languageSavedWithFallback,
  };
}
