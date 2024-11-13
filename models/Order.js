import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, required: true },
    userId: { type: String, required: true },
    userData: { type: Object, required: true },
    appointmentData: { type: String, required: true },
    status: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

const Order = mongoose.model('order', orderSchema);

export default Order;
