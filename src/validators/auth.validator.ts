import Joi from 'joi';

// POST /auth/apple/login
export const appleLoginSchema = Joi.object({
  userIdentifier: Joi.string().required(),
  email: Joi.string().email().optional().allow(null, ''),
  authorizationCode: Joi.string().optional().allow(null, ''),
});

// POST /auth/apple/revoke
export const appleRevokeSchema = Joi.object({
  refreshToken: Joi.string().required(),
});
