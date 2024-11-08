import express from 'express';
import {
  bookAppointment,
  createUser,
  filterDoctor,
  getUser,
  updateUser,
  userLogin,
} from '../controllers/userController.js';
import authUser from '../middlewares/authUser.js';
import upload from '../middlewares/multer.js';
import { getDoctors } from '../controllers/adminController.js';

const userRouter = express.Router();

userRouter.post('/signup', createUser);
userRouter.post('/login', userLogin);
userRouter.get('/profile', authUser, getUser);
userRouter.post(
  '/update-profile',
  upload.single('image'),
  authUser,
  updateUser
);
userRouter.get('/get-doctors', getDoctors);
userRouter.get('/get-doctors/:filter', filterDoctor);
userRouter.post('/book-appointment', authUser, bookAppointment);

export default userRouter;
