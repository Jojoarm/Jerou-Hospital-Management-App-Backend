import express from 'express';
import {
  addDoctor,
  addEvent,
  adminLogin,
  adminSignUp,
  deleteEvent,
  editEvent,
  getAdmin,
  getAppointments,
  getDashBoardData,
  getDoctors,
  getEvent,
  getEvents,
} from '../controllers/adminController.js';
import authAdmin from '../middlewares/authAdmin.js';
import upload from '../middlewares/multer.js';

const adminRouter = express.Router();

adminRouter.post('/signup', adminSignUp);
adminRouter.post('/login', adminLogin);
adminRouter.get('/profile', authAdmin, getAdmin);
adminRouter.post('/add-doctor', upload.single('image'), authAdmin, addDoctor);
adminRouter.post('/add-event', upload.single('image'), authAdmin, addEvent);
adminRouter.get('/doctors', authAdmin, getDoctors);
adminRouter.get('/appointments', authAdmin, getAppointments);
adminRouter.get('/dashboard-data', authAdmin, getDashBoardData);
adminRouter.get('/events', getEvents);
adminRouter.get('/event/:eventId', getEvent);
adminRouter.post(
  '/edit-event/:eventId',
  upload.single('image'),
  authAdmin,
  editEvent
);
adminRouter.delete('/delete-event/:eventId', authAdmin, deleteEvent);

export default adminRouter;
