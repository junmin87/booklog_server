import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { AppError } from '../errors/AppError';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUser(req.user!.dbUserId);

    if (!user || user.deleted_at !== null) {
      return next(new AppError(401, 'User not found or deleted'));
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
    return next(err);
  }
}

export async function updateCountry(req: Request, res: Response, next: NextFunction) {
  const { country_code, language_code } = req.body;

  try {
    await userService.updateCountry(req.user!.dbUserId, country_code, language_code);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ country 업데이트 실패:', err);
    return next(err);
  }
}

// 애플 탈퇴
export async function deleteAppleUser(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.softDeleteUser(req.user!.dbUserId);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    if (err?.code === 'NOT_FOUND') {
      return next(new AppError(404, '유저 없음'));
    }
    console.error('❌ 계정 탈퇴 실패:', err);
    return next(err);
  }
}
