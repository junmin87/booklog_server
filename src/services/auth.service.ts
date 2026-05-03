import jwt from 'jsonwebtoken';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import qs from 'qs';
import { supabase } from '../lib/supabase';

export function generateAppleClientSecret(): string {
  const resolvedPath = path.resolve(__dirname, '../../', process.env.APPLE_PRIVATE_KEY_PATH!);
  console.log('📁 Apple Private Key 실제 경로:', resolvedPath);

  const exists = fs.existsSync(resolvedPath);
  console.log('📁 파일 존재 여부:', exists);
  if (!exists) {
    throw new Error(`❌ Apple private key file not found at ${resolvedPath}`);
  }

  const privateKey = fs.readFileSync(resolvedPath, 'utf8');
  console.log('🔑 Apple Private Key 길이:', privateKey.length);

  const claims = {
    iss: process.env.APPLE_TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000,
    aud: 'https://appleid.apple.com',
    sub: process.env.APPLE_CLIENT_ID,
  };

  try {
    const token = jwt.sign(claims, privateKey, {
      algorithm: 'ES256',
      keyid: process.env.APPLE_KEY_ID,
      header: {
        alg: 'ES256',
        kid: process.env.APPLE_KEY_ID,
      },
    });
    console.log('✅ Apple client_secret 생성 완료');
    return token;
  } catch (err) {
    console.error('❌ Apple client_secret 생성 실패:', err);
    throw err;
  }
}

export async function revokeAppleToken(refreshToken: string): Promise<void> {
  const clientSecret = generateAppleClientSecret();

  const params = new URLSearchParams();
  params.append('token', refreshToken);
  params.append('token_type_hint', 'refresh_token');
  params.append('client_id', process.env.APPLE_CLIENT_ID!);
  params.append('client_secret', clientSecret);

  const response = await axios.post(
    'https://appleid.apple.com/auth/revoke',
    params.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Apple revoke failed: ${response.status}`);
  }
}

export async function handleUserUpsert(
  userIdentifier: string,
  email: string | null,
  appleRefreshToken: string | null
): Promise<{ countryCode: string | null; dbUserId: string }> {
  const { data: existingUser } = await supabase
    .from('booklog_users')
    .select('id, country_code')
    .eq('apple_user_id', userIdentifier)
    .single();

  if (existingUser) {
    await supabase
      .from('booklog_users')
      .update({
        last_login_at: new Date().toISOString(),
        deleted_at: null,
        ...(appleRefreshToken && { apple_refresh_token: appleRefreshToken }),
      })
      .eq('id', existingUser.id);

    return { countryCode: existingUser.country_code ?? null, dbUserId: existingUser.id };
  }

  const { data: newUser } = await supabase
    .from('booklog_users')
    .insert({
      apple_user_id: userIdentifier,
      email,
      apple_refresh_token: appleRefreshToken,
      last_login_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  return { countryCode: null, dbUserId: newUser!.id };
}

export async function exchangeAppleAuthCode(authorizationCode: string): Promise<string> {
  const clientSecret = generateAppleClientSecret();
  console.log('if authorizationCode >> ');

  const params = qs.stringify({
    client_id: process.env.APPLE_CLIENT_ID!,
    client_secret: clientSecret,
    code: authorizationCode,
    grant_type: 'authorization_code',
    redirect_uri: process.env.APPLE_REDIRECT_URI!,
  });

  const tokenResponse = await axios.post(
    'https://appleid.apple.com/auth/oauth2/v2/token',
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  console.log('✅ Apple refresh_token 획득 성공');
  return tokenResponse.data.refresh_token;
}

export async function getValidatedUser(
  dbUserId: string
): Promise<{ deleted_at: string | null; country_code: string | null } | null> {
  const { data: user } = await supabase
    .from('booklog_users')
    .select('deleted_at, country_code')
    .eq('id', dbUserId)
    .single();

  return user ?? null;
}


export async function handleKakaoUserUpsert(
  kakaoId: string,
  email: string | null
): Promise<{ countryCode: string | null; dbUserId: string }> {
  const { data: existingUser } = await supabase
    .from('booklog_users')
    .select('id, country_code')
    .eq('kakao_user_id', kakaoId)
    .single();

  if (existingUser) {
    await supabase
      .from('booklog_users')
      .update({
        last_login_at: new Date().toISOString(),
        deleted_at: null,
      })
      .eq('id', existingUser.id);

    return { countryCode: existingUser.country_code ?? null, dbUserId: existingUser.id };
  }

  const { data: newUser } = await supabase
    .from('booklog_users')
    .insert({
      kakao_user_id: kakaoId,
      email,
      last_login_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  return { countryCode: null, dbUserId: newUser!.id };
}