const nodemailer = require("nodemailer");
const fs = require("fs");
require("dotenv").config();

function convertToUSD(price) {
  return price / 100;
}

function sendEmail(emailOptions, file) {
  const filePath = file ? file.path : null;

  let mailConfig;

  function generateMailConfig(name, email, description, file, type, items) {
    let subject = "";
    let title = "";

    if (type === "application") {
      subject = "New Order Request";
      title = "You have received a new request";
    } else if (type === "purchase") {
      subject = "New Purchase";
      title = "You have received a new purchase";
    }

    let htmlContent = `<!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <title>${subject}</title>
      </head>
      <body>
      <div style="font-family: Helvetica, Arial, sans-serif; min-width: 1000px; overflow: auto; line-height: 2">
          <div style="margin: 50px auto; width: 70%; padding: 20px 0">
          <div style="border-bottom: 1px solid #eee">
              <a href="" style="font-size: 1.4em; color: #00466a; text-decoration: none; font-weight: 600">${title}</a>
          </div>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${
            description
              ? `<p><strong>Project Description:</strong> ${description}</p>`
              : ""
          }`;

    if (type === "purchase" && items && items.length > 0) {
      const itemsHTML = items
        .map(
          (item) => `
            <tr>
              <td>${item.description}</td>
              <td>${convertToUSD(item.amount_total)}$</td>
            </tr>
          `
        )
        .join("");

      const totalPrice = items.reduce(
        (total, item) => total + convertToUSD(item.amount_total),
        0
      );

      htmlContent += `
        <hr style="border: none; border-top: 1px solid #eee" />
        <table style="width: 100%; border-collapse: collapse; text-align:left;">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        <p><strong>Total Price:</strong> ${totalPrice}</p>`;
    }

    htmlContent += `
      <hr style="border: none; border-top: 1px solid #eee" />
      <div style="float: right; padding: 8px 0; color: #aaa; font-size: 0.8em; line-height: 1; font-weight: 300">
      </div>
      </div>
      </div>
      </body>
      </html>`;

    mailConfig = {
      from: process.env.GMAIL_ADDRESS,
      to: process.env.GMAIL_ADDRESS,
      subject: subject,
      html: htmlContent,
    };

    if (file) {
      mailConfig.attachments = [
        {
          filename: file.originalname,
          path: file.path,
        },
      ];
    }
  }

  generateMailConfig(
    emailOptions.name,
    emailOptions.email,
    emailOptions.description,
    file,
    emailOptions.type,
    emailOptions.items
  );

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_ADDRESS,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailConfig, (error, info) => {
      if (error) {
        console.log(error);
        if (filePath) {
          fs.unlinkSync(filePath);
        }
        return reject({ message: `An error has occurred` });
      }
      if (filePath) {
        fs.unlinkSync(filePath);
      }
      return resolve({ message: "Email sent successfully" });
    });
  });
}

module.exports = { sendEmail };
