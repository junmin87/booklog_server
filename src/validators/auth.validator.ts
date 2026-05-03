import Joi from 'joi';

// POST /auth/apple/login
export const appleLoginSchema = Joi.object({
  // identityToken값때문에 플러단에서 apple login 400 발생. 정의되지않았기 때문임. 아래 추가
  // identityToken: Joi.string().optional().allow(null, ''),  // 옵셔널이 아니라 리콰이어드
  identityToken: Joi.string().required(),
  userIdentifier: Joi.string().required(),
  email: Joi.string().email().optional().allow(null, ''),
  // authorizationCode: Joi.string().optional().allow(null, ''),
  authorizationCode: Joi.string().required()
});

// POST /auth/apple/revoke
export const appleRevokeSchema = Joi.object({
  refreshToken: Joi.string().required(),
});
