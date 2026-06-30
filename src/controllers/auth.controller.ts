import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  generateAppleClientSecret,
  revokeAppleToken,
  handleUserUpsert,
  exchangeAppleAuthCode,
  getValidatedUser,
  handleKakaoUserUpsert,  // 카카오
} from '../services/auth.service';
import { AppError } from '../errors/AppError';
import { sendSuccess } from '../utils/response';
import {
  JwtPayload,
  AppleLoginBody,
  AppleRevokeBody,
  KakaoLoginBody,
  KakaoUserResponse,
  ValidateTokenResponse,
  LoginResponse,
  MessageResponse,
} from '../types';



export { generateAppleClientSecret, revokeAppleToken };

// 오토 로그인때 주로 사용함
// JWT token validation
export async function validateToken(req: Request, res: Response<ValidateTokenResponse>, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(400, 'accessToken 누락'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const { userId, email, snsType } = decoded;

    const user = await getValidatedUser(decoded.dbUserId);

    if (!user || user.deleted_at !== null) {
      return next(new AppError(401, 'User not found or deleted'));
    }

    return sendSuccess(res, {
      valid: true,
      userId,
      email: email ?? null,
      snsType,
      country_code: user.country_code ?? null,
    });
  } catch (err) {
    console.error('[TOKEN VERIFY ERROR]', err);
    return next(new AppError(401, 'Invalid or expired token'));
  }
}

// Apple Sign In
export async function appleLogin(
  req: Request<Record<string, never>, LoginResponse, AppleLoginBody>,
  res: Response<LoginResponse>,
  next: NextFunction
) {
  const { userIdentifier, email, authorizationCode } = req.body;

  let refreshToken: string | null = null;

  if (authorizationCode) {
    try {
      refreshToken = await exchangeAppleAuthCode(authorizationCode);
    } catch (err) {
      console.error('❌ Apple authorizationCode 토큰 요청 실패:', err);
      return next(new AppError(500, 'Apple 토큰 요청 실패'));
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

  return sendSuccess(res, {
    serverToken,
    ...(refreshToken && { refreshToken }),
    country_code: countryCode,
  });
}

// Apple token revocation
export async function appleRevoke(
  req: Request<Record<string, never>, MessageResponse, AppleRevokeBody>,
  res: Response<MessageResponse>,
  next: NextFunction
) {
  try {
    const { refreshToken } = req.body;
    await revokeAppleToken(refreshToken);
    return sendSuccess(res, { message: 'Apple token revoked successfully' });
  } catch (error) {
    console.error('❌ Apple revoke error:', error);
    return next(new AppError(500, 'Failed to revoke Apple token'));
  }
}

// Kakao Login
export async function kakaoLogin(
  req: Request<Record<string, never>, LoginResponse, KakaoLoginBody>,
  res: Response<LoginResponse>,
  next: NextFunction
) {
  const { accessToken } = req.body;

  if (!accessToken) {
    return next(new AppError(400, 'accessToken 누락'));
  }


  // 카카오 API로 유저 정보 조회
  // Verify user by calling Kakao API with the access token
  let kakaoUser: KakaoUserResponse;
  try {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      return next(new AppError(401, '카카오 토큰 검증 실패'));
    }
    kakaoUser = await response.json();
  } catch (err) {
    console.error('❌ 카카오 유저 정보 조회 실패:', err);
    return next(new AppError(500, '카카오 API 요청 실패'));
  }

  const kakaoId = String(kakaoUser.id);
  const email = kakaoUser.kakao_account?.email ?? null;

  let countryCode: string | null = null;
  let dbUserId: string | null = null;
  try {
    // const result = await handleUserUpsert(kakaoId, email, null);
    const result = await handleKakaoUserUpsert(kakaoId, email);
    countryCode = result.countryCode;
    dbUserId = result.dbUserId;
  } catch (err) {
    console.error('❌ Supabase DB 처리 실패:', err);
  }

  const serverToken = jwt.sign(
    {
      snsType: 'kakao',
      userId: kakaoId,
      dbUserId: dbUserId,
      ...(email && { email }),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '30d' }
  );

  return sendSuccess(res, {
    serverToken,
    country_code: countryCode,
  });
}
