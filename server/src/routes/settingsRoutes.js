import { Router } from 'express';
import { settingsController } from '../controllers/settingsController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

router.use(authenticateUser);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/send-test-email', settingsController.sendTestEmail);
router.post('/trigger-daily-scheduler', settingsController.triggerDailyScheduler);

export default router;

