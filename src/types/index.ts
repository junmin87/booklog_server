import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  dbUserId: string;
  snsType: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
