// JWT payload signed for authenticated sessions, plus the Express request
// augmentation that exposes it on `req.user`.

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
