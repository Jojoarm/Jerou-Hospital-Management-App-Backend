import express from 'express';
import {
  createUser,
  getUser,
  updateUser,
  userLogin,
} from '../controllers/userController.js';
import authUser from '../middlewares/authUser.js';
import upload from '../middlewares/multer.js';

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

export default userRouter;
