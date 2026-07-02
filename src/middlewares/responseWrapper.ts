import { Request, Response, NextFunction } from 'express';

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

interface ErrorEnvelope {
  success: false;
  error: unknown;
}

// Extracts a meaningful error payload from an error-status body.
// Controllers/errorHandler emit shapes like { error: '...' } or { message: '...' };
// fall back to the raw body when neither field is present.
function extractError(body: unknown): unknown {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if ('error' in record) return record.error;
    if ('message' in record) return record.message;
  }
  return body;
}

// Wraps every res.json() payload in a standardized envelope:
//   success (status < 400) -> { success: true, data: <body> }
//   error   (status >= 400) -> { success: false, error: <body.error | body.message | body> }
// Intended for /api/v2 routes only; the original res.json is restored per-response.
export function responseWrapper(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  let wrapped = false;

  res.json = (body: unknown): Response => {
    // Guard against re-entrant/double wrapping on the same response.
    if (wrapped) {
      return originalJson(body);
    }
    wrapped = true;

    if (res.statusCode >= 400) {
      const errorEnvelope: ErrorEnvelope = {
        success: false,
        error: extractError(body),
      };
      return originalJson(errorEnvelope);
    }

    const successEnvelope: SuccessEnvelope<unknown> = {
      success: true,
      data: body,
    };
    return originalJson(successEnvelope);
  };

  next();
}
