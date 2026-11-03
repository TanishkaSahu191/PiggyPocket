import { Router } from 'express';
import { budgetController } from '../controllers/budgetController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

// Protect all budget endpoints with JWT authentication
router.use(authenticateUser);

router.get('/month/:month', budgetController.getMonth);
router.post('/month', budgetController.saveMonth);
router.get('/all', budgetController.getAllMonths);
router.post('/rollover', budgetController.resolveRollover);
router.post('/sync-local', budgetController.syncLocal);

export default router;

