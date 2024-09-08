const express = require("express");
const routes = express.Router();

const {
  signupWithGoogle_post,
  loginWithGoogle_post,
  signup_post,
  login_post,
  logout_get,
  verify,
  forgotPassLetter_post,
  forgotPassReset_post,
  resendVerifivationCode,
  isJWTTokenValid,
  getUserInfo,
} = require("./controllers");
const { requireAuth } = require("../../middleware/authMiddleware");

routes.post("/signup-google", signupWithGoogle_post);
routes.post("/login-google", loginWithGoogle_post);
routes.post("/signup", signup_post);
routes.post("/login", login_post);
routes.get("/logout", logout_get);
routes.post("/verify", verify);
routes.post("/reset-password", forgotPassLetter_post);
routes.post("/reset-new-password/:token", forgotPassReset_post);
routes.post("/resend-code", resendVerifivationCode);
routes.post("/is-jwt-valid", isJWTTokenValid);
routes.post("/get-user-info", requireAuth, getUserInfo);

module.exports = routes;
