import express from 'express';
import {
  addDoctor,
  adminLogin,
  adminSignUp,
  getAdmin,
  getDoctors,
} from '../controllers/adminController.js';
import authAdmin from '../middlewares/authAdmin.js';
import upload from '../middlewares/multer.js';

const adminRouter = express.Router();

adminRouter.post('/signup', adminSignUp);
adminRouter.post('/login', adminLogin);
adminRouter.get('/profile', authAdmin, getAdmin);
adminRouter.post('/add-doctor', upload.single('image'), authAdmin, addDoctor);
adminRouter.get('/doctors', authAdmin, getDoctors);

export default adminRouter;
