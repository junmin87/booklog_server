import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  getBestseller,
  searchBook,
  addBook,
  listBooks,
  addSentence,
  getSentences,
  setRepresentativeSentence,
} from '../controllers/book.controller';
import { validate } from '../middlewares/validate';
import { addBookSchema, addSentenceSchema } from '../validators/book.validator';

const router = Router();

router.get('/book/bestseller', getBestseller);
router.get('/book/search', searchBook);
router.post('/book/add', authenticate, validate(addBookSchema), addBook);
router.get('/book/list', authenticate, listBooks);
router.post('/books/:bookId/sentences', authenticate, validate(addSentenceSchema), addSentence);
router.get('/books/:bookId/sentences', authenticate, getSentences);
router.patch('/books/:bookId/sentences/:sentenceId/representative', authenticate, setRepresentativeSentence);

export default router;
