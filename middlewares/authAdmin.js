import jwt from 'jsonwebtoken';

// user authentication
const authAdmin = async (req, res, next) => {
  try {
    const { atoken } = req.headers;
    if (!atoken) {
      return res.json({ success: false, message: 'Not authorized' });
    }

    const decoded_token = jwt.verify(atoken, process.env.JWT_SECRET);
    req.body.adminId = decoded_token.id;
    next();
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default authAdmin;
