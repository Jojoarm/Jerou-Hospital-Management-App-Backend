import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 5000;

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

app.use('/api', (req, res) => res.send('Hello World'));

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
