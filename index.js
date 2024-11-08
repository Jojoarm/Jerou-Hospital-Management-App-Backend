import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import 'dotenv/config';
import userRouter from './routes/userRoutes.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoutes.js';
import doctorRouter from './routes/doctorRoutes.js';

const app = express();
const port = process.env.PORT || 5000;

//connect cloudinary
connectCloudinary();

//mongoose connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to DB'));

app.use(express.json());
app.use(cookieParser()); //allows us to parse incoming cookies: res.cookies

const corsOptions = {
  origin: '*',
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/doctor', doctorRouter);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
