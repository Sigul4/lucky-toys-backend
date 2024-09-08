const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;


  // check json web token exists & is verified
  if (token) {
    jwt.verify(token, process.env.SECRET_TOKEN, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.status(401).json({ token: false });
      } else {
        console.log(decodedToken);
        req.decodedToken = decodedToken;
        next();
      }
    });
  } else {
    res.status(400).json({ token: false });
  }
};

module.exports = { requireAuth };
