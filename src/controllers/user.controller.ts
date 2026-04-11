import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { revokeAppleToken } from './auth.controller';

export async function getMe(req: Request, res: Response) {
  try {
    const { data: user } = await supabase
      .from('booklog_users')
      .select('id, email, country_code, language_code, plan, deleted_at')
      .eq('id', req.user!.dbUserId)
      .single();

    if (!user || user.deleted_at !== null) {
      return res.status(401).json({ error: 'User not found or deleted' });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email ?? null,
      countryCode: user.country_code ?? null,
      languageCode: user.language_code ?? null,
      plan: user.plan,
      snsType: req.user!.snsType,
      snsId: req.user!.userId,
    });
  } catch (err) {
    console.error('❌ 유저 정보 조회 실패:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function updateCountry(req: Request, res: Response) {
  const { country_code, language_code } = req.body;

  if (!country_code) {
    return res.status(400).json({ error: 'country_code 누락' });
  }

  try {
    const { error } = await supabase
      .from('booklog_users')
      .update({ country_code, language_code })
      .eq('id', req.user!.dbUserId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ country 업데이트 실패:', err);
    return res.status(500).json({ error: '업데이트 실패' });
  }
}

// 애플 탈퇴
export async function deleteAppleUser(req: Request, res: Response) {
  try {
    const { data: user } = await supabase
      .from('booklog_users')
      .select('apple_refresh_token')
      .eq('id', req.user!.dbUserId)
      .single();

    if (!user) {
      return res.status(404).json({ error: '유저 없음' });
    }

    if (user.apple_refresh_token) {
      await revokeAppleToken(user.apple_refresh_token);
    }

    const { error } = await supabase
      .from('booklog_users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.user!.dbUserId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ 계정 탈퇴 실패:', err);
    return res.status(500).json({ error: '계정 탈퇴 실패' });
  }
}
