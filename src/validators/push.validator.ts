import Joi from 'joi';

// POST /cron/send-push
// All fields are optional; the controller falls back to default copy when absent.
export const sendPushSchema = Joi.object({
  title: Joi.string().optional().allow(null, ''),
  content: Joi.string().optional().allow(null, ''),
  topic: Joi.string().optional().allow(null, ''),
});
