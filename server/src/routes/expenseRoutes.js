import { Router } from 'express';
import { expenseController } from '../controllers/expenseController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

// Protect all expense endpoints with JWT authentication
router.use(authenticateUser);

router.post('/', expenseController.addOrUpdate);
router.delete('/:id', expenseController.delete);

export default router;

