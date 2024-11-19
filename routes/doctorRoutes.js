import express from 'express';
import {
  addPost,
  appointmentCancel,
  appointmentComplete,
  deletePost,
  doctorDashBoard,
  doctorLogin,
  editPost,
  getDoctor,
  getDoctorAppointments,
  getPost,
  getPosts,
  updateProfile,
} from '../controllers/doctorController.js';
import authDoctor from '../middlewares/authDoctor.js';
import upload from '../middlewares/multer.js';

const doctorRouter = express.Router();

doctorRouter.post('/login', doctorLogin);
doctorRouter.get('/doctor-profile', authDoctor, getDoctor);
doctorRouter.post(
  '/update-profile',
  upload.single('image'),
  authDoctor,
  updateProfile
);
doctorRouter.post('/add-post', upload.single('image'), authDoctor, addPost);
doctorRouter.get('/posts', authDoctor, getPosts);
doctorRouter.get('/post/:postId', getPost);
doctorRouter.get('/dashboard-data', authDoctor, doctorDashBoard);
doctorRouter.post(
  '/edit-post/:postId',
  upload.single('image'),
  authDoctor,
  editPost
);
doctorRouter.delete('/delete-post/:postId', authDoctor, deletePost);
doctorRouter.get('/appointments', authDoctor, getDoctorAppointments);
doctorRouter.post('/complete-appointment', authDoctor, appointmentComplete);
doctorRouter.post('/cancel-appointment', authDoctor, appointmentCancel);

export default doctorRouter;
