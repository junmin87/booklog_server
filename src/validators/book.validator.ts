import Joi from 'joi';
import { BOOK_STATUSES } from '../types';

// DEPRECATED: legacy values, remove after client rollout.
// Old Flutter clients still send these; accepted here only at the input
// boundary and normalized to BOOK_STATUSES in the service layer.
const LEGACY_STATUS_VALUES = ['wish', 'want', 'done'] as const;
const ACCEPTED_STATUS_VALUES = [...BOOK_STATUSES, ...LEGACY_STATUS_VALUES];

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
  status: Joi.string().valid(...ACCEPTED_STATUS_VALUES).optional(),
  current_page: Joi.number().integer().min(0).optional(),
  total_page: Joi.number().integer().min(1).optional().allow(null),
});

// POST /books/:bookId/sentences
export const addSentenceSchema = Joi.object({
  content: Joi.string().required(),
  pageNumber: Joi.number().integer().min(1).optional().allow(null),
});

// PATCH /books/:bookId/status
export const updateBookStatusSchema = Joi.object({
  status: Joi.string().valid(...ACCEPTED_STATUS_VALUES).required(),
});
