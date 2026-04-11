import Joi from 'joi';

// POST /user/country
export const updateCountrySchema = Joi.object({
  country_code: Joi.string().required(),
  language_code: Joi.string().optional().allow(null, ''),
});
