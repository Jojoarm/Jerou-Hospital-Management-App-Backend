import jwt from 'jsonwebtoken';

//doctor authentication
const authDoctor = async (req, res, next) => {
  try {
    const { dtoken } = req.headers;
    if (!dtoken) {
      return res.json({ success: false, message: 'Not Authorized' });
    }
    const decoded_token = jwt.verify(dtoken, process.env.JWT_SECRET);
    req.body.docId = decoded_token.id;
    next();
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default authDoctor;
