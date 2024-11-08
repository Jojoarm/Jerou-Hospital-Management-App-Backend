import validator from 'validator';
import Admin from '../models/Admin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import Doctor from '../models/Doctor.js';

//fetch single doctor
const getDoctor = async (req, res) => {
  try {
    const docId = req.params.docId;
    const doctor = await Doctor.findById(docId).select('-password');
    if (!doctor) {
      return res
        .status(400)
        .json({ success: false, message: 'Doctor not available' });
    }
    return res
      .status(201)
      .json({ success: true, message: 'Doctor fetched', doctor });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export { getDoctor };
