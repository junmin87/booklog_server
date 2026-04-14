import { supabase } from '../lib/supabase';
import { revokeAppleToken } from './auth.service';

export async function getUser(dbUserId: string): Promise<{
  id: string;
  email: string | null;
  country_code: string | null;
  language_code: string | null;
  plan: string;
  deleted_at: string | null;
} | null> {
  const { data: user } = await supabase
    .from('booklog_users')
    .select('id, email, country_code, language_code, plan, deleted_at')
    .eq('id', dbUserId)
    .single();

  return user ?? null;
}

export async function updateCountry(
  dbUserId: string,
  country_code: string,
  language_code: string
): Promise<void> {
  const { error } = await supabase
    .from('booklog_users')
    .update({ country_code, language_code })
    .eq('id', dbUserId);

  if (error) throw error;
}

export async function softDeleteUser(dbUserId: string): Promise<void> {
  const { data: user } = await supabase
    .from('booklog_users')
    .select('apple_refresh_token')
    .eq('id', dbUserId)
    .single();

  if (!user) {
    throw Object.assign(new Error('유저 없음'), { code: 'NOT_FOUND' });
  }

  if (user.apple_refresh_token) {
    await revokeAppleToken(user.apple_refresh_token);
  }

  const { error } = await supabase
    .from('booklog_users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', dbUserId);

  if (error) throw error;
}

export async function updateFcmToken(dbUserId: string, fcmToken: string): Promise<void> {
  const { error } = await supabase
    .from('booklog_users')
    .update({ fcm_token: fcmToken })
    .eq('id', dbUserId);

  if (error) throw error;
}

export async function deleteFcmToken(dbUserId: string): Promise<void> {
  const { error } = await supabase
    .from('booklog_users')
    .update({ fcm_token: null })
    .eq('id', dbUserId);

  if (error) throw error;
}
