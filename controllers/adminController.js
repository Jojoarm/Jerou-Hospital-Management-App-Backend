import validator from 'validator';
import Admin from '../models/Admin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Event from '../models/Event.js';

//admin signin up
const adminSignUp = async (req, res) => {
  try {
    const { name, email, password, adminKey } = req.body;
    if (!name || !email || !password || !adminKey) {
      return res
        .status(400)
        .json({ success: false, message: 'All fields are required!' });
    }
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: 'Enter a valid email' });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: 'Enter a stronger password' });
    }

    //check if admin key match
    const adminKeyMatch = adminKey === process.env.ADMIN_KEY;

    if (!adminKeyMatch) {
      return res
        .status(400)
        .json({ success: false, message: 'Unauthorized, invalid admin key!' });
    }

    //check if admnin already exist
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ success: false, message: 'Admin already exist!' });
    }

    //hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const hashedAdminKey = await bcrypt.hash(adminKey, salt);

    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      adminKey: hashedAdminKey,
    });
    await admin.save();

    return res.status(201).json({
      success: true,
      message: 'Admin successfully added',
      admin,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password, adminKey } = req.body;

    //find the admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Credentials!' });
    }

    //verify password and admin key
    const isMatched = await bcrypt.compare(password, admin.password);
    const isAdminKeyMatched = await bcrypt.compare(adminKey, admin.adminKey);
    if (!isMatched || !isAdminKeyMatched) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Credentials!' });
    }

    //generate token
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'Admin logged in successfully',
      admin,
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//fetch admin
const getAdmin = async (req, res) => {
  try {
    const { adminId } = req.body;

    //check for user
    const admin = await Admin.findById(adminId).select('-password -adminKey');
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: 'Admin not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Admin fetched successfully',
      admin,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//admin add doctor
const addDoctor = async (req, res) => {
  try {
    const {
      adminId,
      name,
      email,
      password,
      speciality,
      experience,
      fee,
      qualification,
      address,
      about,
    } = req.body;
    const imageFile = req.file;

    //validation
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: 'Enter a valid email' });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: 'Enter a stronger password' });
    }

    //check if doctor already exist
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res
        .status(400)
        .json({ success: false, message: 'Doctor already exist' });
    }

    //hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //upload image to cloudinary
    const uploadImage = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: 'image',
    });
    const imageUrl = uploadImage.secure_url;

    const doctor = new Doctor({
      adminId,
      name,
      email,
      password: hashedPassword,
      speciality,
      experience,
      fee,
      qualification,
      address,
      about,
      image: imageUrl,
      date: Date.now(),
    });
    await doctor.save();
    return res.status(201).json({
      success: true,
      message: 'Doctor successfully added',
      doctor,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//get doctors
const getDoctors = async (req, res) => {
  try {
    const query = req.query.q;
    let doctors;
    if (query) {
      const regex = new RegExp(query, 'i', 'g');
      doctors = await Doctor.find({
        $or: [
          {
            name: regex,
          },
          {
            speciality: regex,
          },
        ],
      });
    } else {
      doctors = await Doctor.find().select('-password');
    }

    return res.status(201).send({
      success: true,
      message: 'Doctors fetched successfully',
      doctors,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//fetch appointments
const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find();
    if (!appointments) {
      return res.status(404).json({
        success: false,
        message: 'Appointments not fetched successfully',
      });
    }
    return res.status(201).json({
      success: true,
      message: 'Appointments fetched',
      appointments: appointments.reverse(),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getDashBoardData = async (req, res) => {
  try {
    const doctors = await Doctor.find();
    const users = await User.find();
    const appointments = await Appointment.find();

    return res.status(201).json({
      success: true,
      message: 'Dashbord data fetched',
      doctors: doctors.length,
      users: users.length,
      appointments: appointments.length,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//add event
const addEvent = async (req, res) => {
  try {
    const { adminId, title, description, date, time, registration, fee } =
      req.body;
    const imageFile = req.file;

    if (!adminId) {
      return res
        .status(500)
        .json({ success: false, message: 'Not Authorized!' });
    }

    //upload image to cloudinary
    const uploadImage = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: 'image',
    });
    const imageUrl = uploadImage.secure_url;

    const event = new Event({
      adminId,
      title,
      image: imageUrl,
      description,
      registration,
      date,
      time,
      fee,
    });

    await event.save();

    return res.status(201).json({
      success: true,
      message: 'Event successfully added',
      event,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//fetch event
const getEvents = async (req, res) => {
  try {
    const events = await Event.find();
    if (!events) {
      return res
        .status(404)
        .json({ success: false, message: 'No event found' });
    }

    return res.status(201).json({
      success: true,
      message: 'Event fetched successfully',
      events: events.reverse(),
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

//get single event
const getEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: 'Event not found!' });
    }

    return res.status(201).json({
      success: true,
      message: 'Event fetched successfully',
      event,
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const editEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, description, registration, date, time, fee } = req.body;
    const imageFile = req.file;

    if (!title || !description || !registration || !date || !time || !fee) {
      return res
        .status(400)
        .json({ success: false, message: 'Some data missing' });
    }

    await Event.findByIdAndUpdate(eventId, {
      title,
      description,
      registration,
      date,
      time,
      fee,
    });

    //check if there's a new image
    if (imageFile) {
      const uploadImage = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: 'image',
      });
      const imageUrl = uploadImage.secure_url;
      await Event.findByIdAndUpdate(eventId, { image: imageUrl });
    }

    return res
      .status(201)
      .json({ success: true, message: 'Event updated successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    await Event.findByIdAndDelete(eventId);
    return res.json({ success: true, message: 'Event deleted!' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export {
  adminSignUp,
  adminLogin,
  getAdmin,
  addDoctor,
  getDoctors,
  getAppointments,
  getDashBoardData,
  addEvent,
  getEvents,
  getEvent,
  editEvent,
  deleteEvent,
};
