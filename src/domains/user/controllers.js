require("dotenv").config();
const User = require("./model");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const _ = require("lodash");

// handle errors
const handleErrors = (err) => {
  console.log(err.message, err.code);
  let errors = { email: "", password: "", account: "" };

  // incorrect email
  if (err.message === "incorrect email") {
    errors.email = "That email is not registered";
  }

  // incorrect password
  if (err.message === "incorrect password") {
    errors.password = "That password is incorrect";
  }

  // duplicate email error
  if (err.code === 11000) {
    if (err.keyPattern.email) errors.email = "that email is already registered";
    // if (err.keyPattern.phone) errors.phone = "that phone is already registered";
    return errors;
  }

  if (err.message.includes("read properties of null")) {
    errors.account = "Account dont exist!";
    return errors;
  }

  // validation errors
  if (err.message.includes("user validation failed")) {
    // console.log(err);
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
};

const allowedFields = [
  "_id",
  "email",
  "first_name",
  "last_name",
  "paymentStatus",
];

const handleReturnValues = (obj) => {
  return allowedFields.reduce((result, key) => {
    result[key] = obj[key];
    return result;
  }, {});
};

const maxAge = 3 * 24 * 60 * 60;
const secret = process.env.SECRET_TOKEN;
const createToken = (id, age = maxAge) => {
  return jwt.sign({ id }, secret, {
    expiresIn: age,
  });
};

function createVerifCode(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return _.times(length, () => _.sample(characters)).join("");
}

module.exports.isJWTTokenValid = async (req, res) => {
  const token = req.cookies.jwt;

  // check json web token exists & is verified
  if (token) {
    jwt.verify(token, process.env.SECRET_TOKEN, async (err, decodedToken) => {
      if (err) {
        res.status(400).json({ isValid: false, data: null });
      } else {
        const user = await User.findById(decodedToken.id);
        if (user)
          res.status(200).json({ isValid: true, data: { email: user.email } });
        else res.status(400).json({ isValid: false, data: null });
      }
    });
  } else {
    res.status(400).json({ isValid: false, data: null });
  }
};

module.exports.getUserInfo = async (req, res) => {
  const { id } = req.decodedToken;

  try {
    const user = await User.findById(id);

    res.status(201).json(handleReturnValues(user));
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};
module.exports.signup_post = async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  try {
    const user = await User({ first_name, last_name, email, password });
    const verifCode = createVerifCode(8);
    user.verificationCode = verifCode;
    await user.save();

    sendVerificationEmail(user.email, verifCode);

    res.status(201).json({
      message: "Verification code sent",
    });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.resendVerifivationCode = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user.verification) {
      res.status(201).json({
        message: "User already verified",
      });
      return;
    }

    const verifCode = createVerifCode(8);

    user.verificationCode = verifCode;
    await user.save();

    sendVerificationEmail(user.email, verifCode);

    res.status(201).json({
      message: "Verification code resent",
    });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.signupWithGoogle_post = async (req, res) => {
  const { accessKey } = req.body;

  try {
    const authData = jwt.decode(accessKey);
    const user = new User({
      first_name: authData.given_name,
      last_name: authData.family_name || "",
      email: authData.email,
      verification: true,
      password: `${authData.email}_${authData.given_name}`,
      isWithGoogle: true,
    });

    await user.save();

    const token = createToken(user._id);
    res.cookie("jwt", token, {
      secure: true,
      httpOnly: true,
      sameSite: "None",
      maxAge: maxAge * 1000,
    });

    res.status(200).json(handleReturnValues(user));
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.loginWithGoogle_post = async (req, res) => {
  const { accessKey } = req.body;

  try {
    const authData = jwt.decode(accessKey);

    const user = await User.findOne({ email: authData.email });
    // if (user) throw new Error("Account dont exist");

    const token = createToken(user._id);
    res.cookie("jwt", token, {
      secure: true,
      httpOnly: true,
      sameSite: "None",
      maxAge: maxAge * 1000,
    });

    res.status(200).json(handleReturnValues(user));
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};
module.exports.login_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);

    res.cookie("jwt", token, {
      secure: true,
      httpOnly: true,
      sameSite: "None",
      maxAge: maxAge * 1000,
    });

    res.status(200).json(handleReturnValues(user));
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.logout_get = (req, res) => {
  res.cookie("jwt", "", {
    secure: true,
    httpOnly: true,
    sameSite: "None",
    maxAge: 1,
  });
  res.status(200).json({ message: "logout" });
};

module.exports.verify = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email: email });

    if (user.verificationCode !== code) {
      return res.status(404).json({ message: "Invalid code" });
    }

    user.verification = true;
    user.verificationCode = "";
    await user.save();

    const token = createToken(user._id);
    res.cookie("jwt", token, {
      secure: true,
      httpOnly: true,
      sameSite: "None",
      maxAge: maxAge * 1000,
    });

    res.json({
      message: "Email verified successfully",
      user: handleReturnValues(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const sendVerificationEmail = (email, code) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_ADDRESS,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_ADDRESS,
    to: email,
    subject: "Email Verification",
    html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
      <h2 style="color: #212121;">Welcome to WooHoo!</h2>
      <p>Vevification code: <b>${code}</b></p>
    </div>
  `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log("Verification Email sent: " + info.response);
    }
  });
};

const sendResetPasswordEmail = (email, token) => {
  const resetLink = `${process.env.BASE_URL}/reset-password/${token}`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_ADDRESS,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_ADDRESS,
    to: email,
    subject: "Reset Password",
    html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
      <h2 style="color: #212121;">Account Recovery - Reset Your Password</h2>
      <p style="color: #616161; font-size: 16px;">We received a request to reset your password. To proceed, please click the link below:</p>
      
      <a href="${resetLink}" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background-color: #ff6b31; color: #fff; text-decoration: none; border-radius: 5px; font-size: 16px;">Reset Password</a>
      
      <p style="color: #616161; font-size: 16px; margin-top: 15px;">If you didn't request a password reset, you can ignore this email.</p>
      
      <p style="color: #757575; font-size: 14px;">Note: This link is valid for a limited time.</p>
      
      <p style="color: #757575; font-size: 14px;">Best regards,<br/>WooHoo Team</p>
    </div>
  `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log("Reset Password Email sent: " + info.response);
    }
  });
};

module.exports.forgotPassLetter_post = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      throw Error("Invalid email");
    }

    const resetToken = jwt.sign({ email: email }, secret, { expiresIn: "1h" });

    sendResetPasswordEmail(email, resetToken);

    res.status(200).json({
      message: "Reset password email sent",
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

module.exports.forgotPassReset_post = async (req, res) => {
  const token = req.params.token;
  const { newPassword, confirmPassword } = req.body;

  try {
    jwt.verify(token, process.env.SECRET_TOKEN, async (err, value) => {
      const { email } = value;

      if (err) {
        res.status(400).json({ error: err });
      } else {
        const user = await User.findOne({ email });

        if (newPassword === confirmPassword) {
          user.password = newPassword;

          await user.save();
          res.status(200).json({ data: "Password changed successfully" });
        } else {
          throw Error("Incorrect password");
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};
