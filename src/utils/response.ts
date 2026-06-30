import { Response } from 'express';

export interface SuccessBody<T> {
  success: true;
  data: T;
}

export interface ErrorBody {
  success: false;
  error: string;
}

// Standard success envelope: { success: true, data }.
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, data });
}

// Standard error envelope: { success: false, error }.
export function sendError(res: Response, message: string, statusCode = 500): Response {
  return res.status(statusCode).json({ success: false, error: message });
}
