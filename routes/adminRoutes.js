import express from 'express';
import {
  adminLogin,
  adminSignUp,
  getAdmin,
} from '../controllers/adminController.js';
import authAdmin from '../middlewares/authAdmin.js';

const adminRouter = express.Router();

adminRouter.post('/signup', adminSignUp);
adminRouter.post('/login', adminLogin);
adminRouter.get('/profile', authAdmin, getAdmin);

export default adminRouter;
