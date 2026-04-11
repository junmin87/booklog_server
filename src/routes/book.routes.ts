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

const router = Router();

router.get('/book/bestseller', getBestseller);
router.get('/book/search', searchBook);
router.post('/book/add', authenticate, addBook);
router.get('/book/list', authenticate, listBooks);
router.post('/books/:bookId/sentences', authenticate, addSentence);
router.get('/books/:bookId/sentences', authenticate, getSentences);
router.patch('/books/:bookId/sentences/:sentenceId/representative', authenticate, setRepresentativeSentence);

export default router;
