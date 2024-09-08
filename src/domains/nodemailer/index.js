const express = require("express");
const multer = require("multer");
const { sendEmail } = require("./controllers");

const routes = express.Router();
const upload = multer({ dest: "public/uploads/" });

routes.post("/send_email", upload.single("file"), (req, res) => {
  sendEmail(req.body, req.file)
    .then((response) => res.send(response.message))
    .catch((error) => res.status(500).send(error.message));
});

module.exports = routes;
