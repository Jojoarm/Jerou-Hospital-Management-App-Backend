import validator from 'validator';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Stripe from 'stripe';
import Order from '../models/Order.js';
import https from 'https';
import crypto from 'crypto';
import PayStack from 'paystack-node';
import Event from '../models/Event.js';
import Post from '../models/Post.js';

const environment = process.env.NODE_ENV;
const paystack = new PayStack(process.env.PAYSTACK_SECRET_KEY, environment);

const STRIPE = new Stripe(process.env.STRIPE_API_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL;
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

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
      return res.json({ success: false, message: 'Doctor not found!' });
    }

    if (!docData.available) {
      return res.json({ success: false, message: 'Doctor not available!' });
    }

    //check if slot is available
    let slots_booked = docData.slots_booked;
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: 'Slot not available!' });
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

//get appointments
const getAppointments = async (req, res) => {
  try {
    const { userId } = req.body;
    const appointments = await Appointment.find({ userId });
    if (!appointments) {
      return res
        .status(400)
        .json({ success: 'false', message: 'No appointment for user found' });
    }
    return res.status(201).json({
      success: true,
      message: 'Appointments fetched successfully',
      appointments,
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

//get a single appointment
const getAppointment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body;
    const appointmentData = await Appointment.findById(appointmentId);
    if (appointmentData.userId !== userId) {
      return res
        .status(400)
        .json({ success: 'false', message: 'Not Authorized!' });
    }
    return res.status(201).json({
      success: true,
      message: 'Appointment fetched successfully',
      appointmentData,
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body;
    //find the appointment
    const appointmentData = await Appointment.findById(appointmentId);
    if (appointmentData.userId !== userId) {
      return res
        .status(400)
        .json({ success: 'false', message: 'Not Authorized!' });
    }

    await Appointment.findByIdAndUpdate(appointmentId, { cancelled: true });

    //remove the canceled slot from doctor's data
    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await Doctor.findById(docId);
    let slots_booked = doctorData.slots_booked;
    //filter out the cancelled slot time from the slot time array
    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (slot) => slot !== slotTime
    );
    await Doctor.findByIdAndUpdate(docId, { slots_booked });

    return res
      .status(201)
      .json({ success: true, message: 'Appointment Cancelled' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const rescheduleAppointment = async (req, res) => {
  try {
    const { userId, appointmentId, slotDate, slotTime } = req.body;
    const appointmentData = await Appointment.findById(appointmentId);
    if (appointmentData.userId !== userId) {
      return res
        .status(400)
        .json({ success: 'false', message: 'Not Authorized!' });
    }
    await Appointment.findByIdAndUpdate(appointmentId, {
      slotDate: slotDate,
      slotTime: slotTime,
      cancelled: false,
    });

    //update the doctor's data appointment slots
    const doctorData = await Doctor.findById(appointmentData.docId);
    let slots_booked = doctorData.slots_booked;
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
    await Doctor.findByIdAndUpdate(appointmentData.docId, { slots_booked });

    return res.status(201).json({
      success: true,
      message: 'Appointment Rescheduled!',
      appointmentData,
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body;
    //find the appointment
    const appointmentData = await Appointment.findById(appointmentId);
    if (appointmentData.userId !== userId) {
      return res
        .status(400)
        .json({ success: 'false', message: 'Not Authorized!' });
    }

    await Appointment.findByIdAndDelete(appointmentId);
    return res
      .status(201)
      .json({ success: true, message: 'Appointment Deleted' });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

//book appointment and make payment using stripe
const stripePayment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body;
    const userData = await User.findById(userId);
    const appointmentData = await Appointment.findById(appointmentId);
    if (!userData || !appointmentData) {
      return res
        .status(400)
        .json({ success: false, message: 'Cannot process payment' });
    }

    const newOrder = new Order({
      appointmentId,
      userId,
      appointmentData,
      userData,
      status: 'placed',
      amount: appointmentData.amount,
    });

    //get the order id for stripe
    const orderId = newOrder._id.toString();

    const lineItems = [
      {
        price_data: {
          //   currency: 'usd',
          currency: 'ngn',
          product_data: {
            name: appointmentData.docData.name,
          },
          unit_amount: Math.round(appointmentData.amount * 100),
        },
        quantity: 1,
      },
    ];
    const session = await STRIPE.checkout.sessions.create({
      line_items: lineItems,
      payment_method_types: ['card'],
      mode: 'payment',
      metadata: { orderId, appointmentId },
      payment_intent_data: {
        metadata: {
          orderId,
          appointmentId,
        },
      },
      success_url: `${FRONTEND_URL}/my-appointments`,
      cancel_url: `${FRONTEND_URL}/doctors`,
    });

    if (!session.url) {
      return res.status(400).json({
        success: false,
        message: 'Error creating stripe session payment',
      });
    }

    await newOrder.save();

    return res.status(201).json({
      success: true,
      message: 'Appointment booked',
      newOrder,
      url: session.url,
    });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const stripeWebHookHandler = async (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = STRIPE.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_ENDPOINT_SECRET
    );
  } catch (error) {
    console.log(error);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const orderId = event.data.object?.metadata?.orderId;
    const appointmentId = event.data.object?.metadata?.appointmentId;
    const order = await Order.findById(orderId);
    const appointment = await Appointment.findById(appointmentId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    await Appointment.findByIdAndUpdate(appointmentId, { paid: true });
    await Order.findByIdAndUpdate(orderId, {
      status: 'paid',
    });
  } else {
    console.log(`Unhandled event type ${event.type}`);
  }
  res.status(200).send();
};

const payStackPayment = async (req, res) => {
  try {
    const { userId, appointmentId } = req.body;
    const userData = await User.findById(userId);
    const appointmentData = await Appointment.findById(appointmentId);
    if (!userData || !appointmentData) {
      return res
        .status(400)
        .json({ success: false, message: 'Cannot process payment' });
    }

    const newOrder = new Order({
      appointmentId,
      userId,
      appointmentData,
      userData,
      status: 'placed',
      amount: appointmentData.amount,
    });

    //get the order id for stripe
    const orderId = newOrder._id.toString();

    const params = JSON.stringify({
      email: userData.email,
      amount: appointmentData.amount * 100,
      callback_url: `${FRONTEND_URL}/paystack-payment-verification`,
      metadata: { orderId, appointmentId },
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const reqPaystack = https
      .request(options, (resPaystack) => {
        let data = '';

        resPaystack.on('data', (chunk) => {
          data += chunk;
        });

        resPaystack.on('end', () => {
          res.send(data);
          console.log(JSON.parse(data));
        });
      })
      .on('error', (error) => {
        console.error(error);
      });

    reqPaystack.write(params);
    reqPaystack.end();
    await newOrder.save();
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

const paystackVerification = async (req, res) => {
  const reference = req.params.reference;
  // ==== Paystack verify call ===== ///
  try {
    const response = await paystack.verifyTransaction({ reference: reference });
    const data = response.body.data;
    if (data.status === 'success') {
      const orderId = data?.metadata?.orderId;
      const appointmentId = data?.metadata?.appointmentId;
      const order = await Order.findById(orderId);
      const appointment = await Appointment.findById(appointmentId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      await Appointment.findByIdAndUpdate(appointmentId, { paid: true });
      await Order.findByIdAndUpdate(orderId, {
        status: 'paid',
      });

      return res
        .status(201)
        .json({ success: true, message: 'Payment verified', data });
    }
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: error.message });
  }
};

//get posts
const getPosts = async (req, res) => {
  try {
    const posts = await Post.find();
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

export {
  createUser,
  userLogin,
  getUser,
  updateUser,
  getDoctor,
  filterDoctor,
  bookAppointment,
  getAppointments,
  cancelAppointment,
  deleteAppointment,
  rescheduleAppointment,
  getAppointment,
  stripePayment,
  stripeWebHookHandler,
  payStackPayment,
  paystackVerification,
  getPosts,
};
