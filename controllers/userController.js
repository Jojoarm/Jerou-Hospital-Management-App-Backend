import validator from 'validator';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';

//create new user
const createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    //validation
    if (!name || !email || !password) {
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

    // check if email is already used
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res
        .status(400)
        .json({ success: false, message: 'User already exist!' });
    }

    //hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //create user
    const user = new User({ email, password: hashedPassword, name });
    await user.save();

    //generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      success: true,
      message: 'User successfully created',
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//user login
const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    //find user with email
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Credentials!' });
    }

    //verify password
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Credentials!' });
    }

    //generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    //update user last login
    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      data: user,
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//fetch user
const getUser = async (req, res) => {
  try {
    const { userId } = req.body;

    //check for user
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//update user
const updateUser = async (req, res) => {
  try {
    const { userId, name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;
    if (!name || !phone || !address || !dob || !gender) {
      return res.json({ success: false, message: 'Data missing' });
    }

    //find user and update
    await User.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });

    //check if there's a new image uploaded
    if (imageFile) {
      //upload to cloudinary
      const uploadImage = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: 'image',
      });
      const imageUrl = uploadImage.secure_url;
      await User.findByIdAndUpdate(userId, { image: imageUrl });
    }
    return res
      .status(200)
      .json({ success: true, message: 'User profile updated' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const filterDoctor = async (req, res) => {
  try {
    const filter = req.params.filter;
    const filteredDocs = await Doctor.find({ speciality: { $in: filter } });
    if (!filteredDocs) {
      return res
        .status(400)
        .json({ success: false, message: 'No doctor found' });
    }

    return res.status(201).send({
      success: true,
      message: 'Doctors filtered',
      filteredDocs,
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

//book appointment
const bookAppointment = async (req, res) => {
  try {
    const { userId, docId, slotDate, slotTime } = req.body;
    const userData = await User.findById(userId).select('-password');
    const docData = await Doctor.findById(docId).select('-password');

    if (!docData) {
      return res
        .status(400)
        .json({ success: false, message: 'Doctor not available!' });
    }

    //check if slot is available
    let slots_booked = docData.slots_booked;
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res
          .status(400)
          .json({ success: false, message: 'Slot not available!' });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [];
      slots_booked[slotDate].push(slotTime);
    }

    //delete booked slot from docData
    delete docData.slots_booked;

    //save new appointment
    const appointment = new Appointment({
      userId,
      docId,
      userData,
      docData,
      amount: docData.fee,
      slotTime,
      slotDate,
      date: Date.now(),
    });
    await appointment.save();

    //save new slots in doctor's data
    await Doctor.findByIdAndUpdate(docId, { slots_booked });

    return res
      .status(201)
      .json({ success: true, message: 'Appointment booked', appointment });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

export {
  createUser,
  userLogin,
  getUser,
  updateUser,
  filterDoctor,
  bookAppointment,
};
