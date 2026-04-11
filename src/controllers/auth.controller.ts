import { Request, Response } from 'express';
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

export async function revokeAppleToken(refreshToken: string) {
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

async function handleUserUpsert(
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

// 오토 로그인때 주로 사용함
// JWT token validation
export async function validateToken(req: Request, res: Response) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'accessToken 누락' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      dbUserId: string;
      email?: string;
      snsType: string;
    };

    const { userId, email, snsType } = decoded as {
      userId: string;
      email?: string;
      snsType: 'apple';
    };

    const { data: user } = await supabase
      .from('booklog_users')
      .select('deleted_at, country_code')
      .eq('id', decoded.dbUserId)
      .single();

    if (!user || user.deleted_at !== null) {
      return res.status(401).json({ valid: false, error: 'User not found or deleted' });
    }

    return res.status(200).json({
      valid: true,
      userId,
      email: email ?? null,
      snsType,
      country_code: user.country_code ?? null,
    });
  } catch (err) {
    console.error('[TOKEN VERIFY ERROR]', err);
    return res.status(401).json({
      valid: false,
      error: 'Invalid or expired token',
    });
  }
}

// Apple Sign In
export async function appleLogin(req: Request, res: Response) {
  const { userIdentifier, email, authorizationCode } = req.body;

  if (!userIdentifier) {
    return res.status(400).json({ error: 'userIdentifier 누락' });
  }

  let refreshToken: string | null = null;

  if (authorizationCode) {
    try {
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

      refreshToken = tokenResponse.data.refresh_token;
      console.log('✅ Apple refresh_token 획득 성공');
    } catch (err) {
      console.error('❌ Apple authorizationCode 토큰 요청 실패:', err);
      return res.status(500).json({ error: 'Apple 토큰 요청 실패' });
    }
  }

  let countryCode: string | null = null;
  let dbUserId: string | null = null;
  try {
    const result = await handleUserUpsert(userIdentifier, email ?? null, refreshToken);
    countryCode = result.countryCode;
    dbUserId = result.dbUserId;
  } catch (err) {
    console.error('❌ Supabase DB 처리 실패:', err);
  }

  const serverToken = jwt.sign(
    {
      snsType: 'apple',
      userId: userIdentifier,
      dbUserId: dbUserId,
      ...(email && { email }),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );

  return res.json({
    serverToken,
    ...(refreshToken && { refreshToken }),
    country_code: countryCode,
  });
}

// Apple token revocation
export async function appleRevoke(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'refreshToken is required' });
    }

    await revokeAppleToken(refreshToken);
    return res.status(200).json({ message: 'Apple token revoked successfully' });
  } catch (error) {
    console.error('❌ Apple revoke error:', error);
    return res.status(500).json({ message: 'Failed to revoke Apple token' });
  }
}
