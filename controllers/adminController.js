import validator from 'validator';
import Admin from '../models/Admin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';

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

    //generate token
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      success: true,
      message: 'Admin successfully added',
      admin,
      token,
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

export { adminSignUp, adminLogin, getAdmin };
