import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { AppError } from '../errors/AppError';
import { sendSuccess } from '../utils/response';
import {
  UpdateCountryBody,
  UpdateFcmTokenBody,
  UserProfileResponse,
  SuccessResponse,
} from '../types';

export async function getMe(req: Request, res: Response<UserProfileResponse>, next: NextFunction) {
  try {
    const user = await userService.getUser(req.user!.dbUserId);

    if (!user || user.deleted_at !== null) {
      return next(new AppError(401, 'User not found or deleted'));
    }

    return sendSuccess(res, {
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
    return next(err);
  }
}

export async function updateCountry(
  req: Request<Record<string, never>, SuccessResponse, UpdateCountryBody>,
  res: Response<SuccessResponse>,
  next: NextFunction
) {
  const { country_code, language_code } = req.body;

  try {
    await userService.updateCountry(req.user!.dbUserId, country_code, language_code);
    return sendSuccess(res, null);
  } catch (err) {
    console.error('❌ country 업데이트 실패:', err);
    return next(err);
  }
}

export async function updateFcmToken(
  req: Request<Record<string, never>, SuccessResponse, UpdateFcmTokenBody>,
  res: Response<SuccessResponse>,
  next: NextFunction
) {
  const { fcm_token } = req.body;

  try {
    await userService.updateFcmToken(req.user!.dbUserId, fcm_token);
    return sendSuccess(res, null);
  } catch (err) {
    console.error('❌ FCM 토큰 업데이트 실패:', err);
    return next(err);
  }
}

export async function deleteFcmToken(req: Request, res: Response<SuccessResponse>, next: NextFunction) {
  try {
    await userService.deleteFcmToken(req.user!.dbUserId);
    return sendSuccess(res, null);
  } catch (err) {
    console.error('❌ FCM 토큰 삭제 실패:', err);
    return next(err);
  }
}

// 애플 탈퇴
export async function deleteAppleUser(req: Request, res: Response<SuccessResponse>, next: NextFunction) {
  try {
    await userService.softDeleteUser(req.user!.dbUserId);
    return sendSuccess(res, null);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'NOT_FOUND') {
      return next(new AppError(404, '유저 없음'));
    }
    console.error('❌ 계정 탈퇴 실패:', err);
    return next(err);
  }
}
