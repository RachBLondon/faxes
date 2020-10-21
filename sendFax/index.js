const express = require("express");
const env = require("env2")("./.env");
const twilio = require("twilio");
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
const AWS = require("aws-sdk");
const streamifier = require("streamifier");
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_S3,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_S3,
});

const app = express();
app.get("/", (req, res) => res.send("Hello Fax"));

app.get("/send-fax", (req, res) => {
  client.fax.faxes
    .create({
      from: process.env.FROM, // the fax number we bought
      to: process.env.TO,
      mediaUrl: "https://www.twilio.com/docs/documents/25/justthefaxmaam.pdf", // replace with your ngrok URL
    })
    .then((fax) => res.send(fax));
});

app.get("/file-to-send", (req, res) => {
  const twilioSignature = req.headers["x-twilio-signature"];
  const url = `https://${req.headers.host}/file-to-send`;

  const requestIsValid = twilio.validateRequest(
    process.env.TWILIO_AUTH,
    twilioSignature,
    url,
    {}
  );

  if (!requestIsValid) {
    return res.status(401).send("Unauthorized");
  }

  var params = {
    Bucket: "faxes",
    Key: "send.pdf", // match the name of the pdf you want to send
  };

  s3.getObject(params, (err, data) => {
    if (err) {
      res.send(console.error(err));
    }
    streamifier
      .createReadStream(data.Body, (chunk) => console.log(chunk))
      .pipe(res);
  });
});

app.listen(8080, () => {
  console.log(`Example app listening at http://localhost:${8080}`);
});
