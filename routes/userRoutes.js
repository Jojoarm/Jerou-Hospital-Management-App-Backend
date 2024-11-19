import express from 'express';
import {
  bookAppointment,
  cancelAppointment,
  createUser,
  deleteAppointment,
  filterDoctor,
  getAppointment,
  getAppointments,
  getDoctor,
  getPosts,
  getUser,
  payStackPayment,
  paystackVerification,
  rescheduleAppointment,
  stripePayment,
  stripeWebHookHandler,
  updateUser,
  userLogin,
  //   verifyPaystackPayment,
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
userRouter.get('/doctor-profile/:docId', getDoctor);
userRouter.get('/get-doctors/:filter', filterDoctor);
userRouter.post('/book-appointment', authUser, bookAppointment);
userRouter.get('/get-appointments', authUser, getAppointments);
userRouter.post('/get-appointment', authUser, getAppointment);
userRouter.post('/cancel-appointment', authUser, cancelAppointment);
userRouter.post('/reschedule-appointment', authUser, rescheduleAppointment);
userRouter.post('/delete-appointment', authUser, deleteAppointment);
userRouter.post('/stripe-checkout', authUser, stripePayment);
userRouter.post('/checkout/webhook', stripeWebHookHandler);
userRouter.post('/paystack-checkout', authUser, payStackPayment);
userRouter.get(
  '/verify-paystack-payment/:reference',
  authUser,
  paystackVerification
);
userRouter.get('/posts', getPosts);
// userRouter.post('/my/webhook/url', payStackWebHookHandler);

export default userRouter;
