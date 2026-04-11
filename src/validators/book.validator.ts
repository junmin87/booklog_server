import Joi from 'joi';

// POST /book/add
export const addBookSchema = Joi.object({
  title: Joi.string().required(),
  author: Joi.string().optional().allow(null, ''),
  publisher: Joi.string().optional().allow(null, ''),
  pub_date: Joi.string().optional().allow(null, ''),
  isbn13: Joi.string().optional().allow(null, ''),
  cover_url: Joi.string().uri().optional().allow(null, ''),
  description: Joi.string().optional().allow(null, ''),
  category_name: Joi.string().optional().allow(null, ''),
  status: Joi.string().valid('reading', 'done', 'want').optional(),
  current_page: Joi.number().integer().min(0).optional(),
  total_page: Joi.number().integer().min(1).optional().allow(null),
});

// POST /books/:bookId/sentences
export const addSentenceSchema = Joi.object({
  content: Joi.string().required(),
  pageNumber: Joi.number().integer().min(1).optional().allow(null),
});
