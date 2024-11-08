import express from 'express';
import { getDoctor } from '../controllers/doctorController.js';

const doctorRouter = express.Router();

doctorRouter.get('/doctor-profile/:docId', getDoctor);

export default doctorRouter;
