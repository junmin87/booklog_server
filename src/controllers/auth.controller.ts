import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  generateAppleClientSecret,
  revokeAppleToken,
  handleUserUpsert,
  exchangeAppleAuthCode,
  getValidatedUser,
} from '../services/auth.service';
import { AppError } from '../errors/AppError';

export { generateAppleClientSecret, revokeAppleToken };

// 오토 로그인때 주로 사용함
// JWT token validation
export async function validateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(400, 'accessToken 누락'));
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

    const user = await getValidatedUser(decoded.dbUserId);

    if (!user || user.deleted_at !== null) {
      return next(new AppError(401, 'User not found or deleted'));
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
    return next(new AppError(401, 'Invalid or expired token'));
  }
}

// Apple Sign In
export async function appleLogin(req: Request, res: Response, next: NextFunction) {
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

  return res.json({
    serverToken,
    ...(refreshToken && { refreshToken }),
    country_code: countryCode,
  });
}

// Apple token revocation
export async function appleRevoke(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    await revokeAppleToken(refreshToken);
    return res.status(200).json({ message: 'Apple token revoked successfully' });
  } catch (error) {
    console.error('❌ Apple revoke error:', error);
    return next(new AppError(500, 'Failed to revoke Apple token'));
  }
}
