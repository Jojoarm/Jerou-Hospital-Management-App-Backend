import validator from 'validator';
import Admin from '../models/Admin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import Doctor from '../models/Doctor.js';
import Post from '../models/Post.js';
import Appointment from '../models/Appointment.js';

//doctor login
const doctorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: 'Doctor not found!' });
    }

    //check if password match
    const isMatched = bcrypt.compare(password, doctor.password);
    if (!isMatched) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid credentials' });
    }

    //generate token
    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    await doctor.save();

    return res
      .status(201)
      .json({ success: true, message: 'Doctor logged in', doctor, token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//get doctor's profile
const getDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    const doctor = await Doctor.findById(docId).select('-password');
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: 'Doctor not found!' });
    }

    return res
      .status(200)
      .json({ success: true, message: 'Doctor profile fetched', doctor });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//edit doctor's profile
const updateProfile = async (req, res) => {
  try {
    const {
      docId,
      name,
      qualification,
      experience,
      speciality,
      available,
      fee,
      address,
      about,
    } = req.body;
    const imageFile = req.file;

    if (
      !name ||
      !qualification ||
      !experience ||
      !speciality ||
      !fee ||
      !address ||
      !about
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Some data missing' });
    }
    await Doctor.findByIdAndUpdate(docId, {
      name,
      qualification,
      experience,
      speciality,
      available,
      fee,
      address,
      about,
    });

    if (imageFile) {
      const uploadImage = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: 'image',
      });
      const imageUrl = uploadImage.secure_url;
      await Doctor.findByIdAndUpdate(docId, { image: imageUrl });
    }

    return res
      .status(201)
      .json({ success: true, message: 'Doctor profile updated!' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//doctor dashboard
const doctorDashBoard = async (req, res) => {
  try {
    const { docId } = req.body;

    // find doctor's appointment
    const docAppointments = await Appointment.find({ docId });

    //find doctor's posts
    const docPosts = await Post.find({ docId });

    //earnings
    let earnings = 0;
    docAppointments.map((item) => {
      if (item.isCompleted || item.paid) {
        earnings += item.amount;
      }
    });

    //patients
    const patients = [];
    docAppointments.map((item) => {
      if (!patients.includes(item.userId)) {
        patients.push(item.userId);
      }
    });

    const dashData = {
      earnings,
      appointments: docAppointments.length,
      patients: patients.length,
      docPosts,
    };

    return res
      .status(201)
      .json({ success: true, message: 'Dashbord data fetched', dashData });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//create post
const addPost = async (req, res) => {
  try {
    const { docId, title, content } = req.body;
    const imageFile = req.file;

    if (!docId) {
      return res
        .status(500)
        .json({ success: false, message: 'Not Authorized!' });
    }

    //fetch doctor details
    const doctorData = await Doctor.findById(docId);

    //to determine the word count we remove excess white space with trim and split each word
    const wordCount = content.trim().split(/\s+/).length;
    const readingTime = wordCount / 200;

    //upload image to cloudinary
    const uploadImage = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: 'image',
    });
    const imageUrl = uploadImage.secure_url;

    const post = new Post({
      docId,
      title,
      image: imageUrl,
      content,
      author: doctorData.name,
      readTime: readingTime,
    });

    await post.save();

    return res.status(201).json({
      success: true,
      message: 'Post successfully added',
      post,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//get posts
const getPosts = async (req, res) => {
  try {
    const { docId } = req.body;
    const posts = await Post.find({ docId });
    if (!posts) {
      return res.status(404).json({ success: false, message: 'No post found' });
    }

    return res.status(201).json({
      success: true,
      message: 'Posts fetched successfully',
      posts: posts.reverse(),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//get single post
const getPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: 'Post not found!' });
    }

    return res.status(201).json({
      success: true,
      message: 'Post fetched successfully',
      post,
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content } = req.body;
    const imageFile = req.file;

    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, message: 'Some data missing' });
    }

    await Post.findByIdAndUpdate(postId, {
      title,
      content,
    });

    //check if there's a new image
    if (imageFile) {
      const uploadImage = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: 'image',
      });
      const imageUrl = uploadImage.secure_url;
      await Post.findByIdAndUpdate(postId, { image: imageUrl });
    }

    return res
      .status(201)
      .json({ success: true, message: 'Post updated successfully' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

//delete post
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    await Post.findByIdAndDelete(postId);
    return res.json({ success: true, message: 'Post deleted!' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

//fetch appointments
const getDoctorAppointments = async (req, res) => {
  try {
    const { docId } = req.body;
    const appointments = await Appointment.find({ docId });
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

//api to mark appointment completed
const appointmentComplete = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const appointmentData = await Appointment.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        isCompleted: true,
      });
      return res.json({ success: true, message: 'Appointment completed' });
    } else {
      return res.json({
        success: false,
        message: 'Cannot complete appointment',
      });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

//api to cancel appointment
const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const appointmentData = await Appointment.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        cancelled: true,
      });
      return res.json({ success: true, message: 'Appointment cancelled' });
    } else {
      return res.json({
        success: false,
        message: 'Cannot cancell appointment',
      });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  doctorLogin,
  getDoctor,
  updateProfile,
  addPost,
  getPosts,
  getPost,
  doctorDashBoard,
  editPost,
  deletePost,
  getDoctorAppointments,
  appointmentComplete,
  appointmentCancel,
};
