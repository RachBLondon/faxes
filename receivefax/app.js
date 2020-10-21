"use strict";

// eslint-disable-next-line import/no-unresolved
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");

const app = express();

const env = require("env2")("./.env");
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_S3,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_S3,
});

const storage = multer.memoryStorage({
  destination: function (req, file, callback) {
    callback(null, "");
  },
  filename: (req, file, cb) => {
    const name = file.originalname;
    cb(null, name);
  },
  mimetype: "application/pdf",
});

const upload = multer({ storage }).single("Media");
// Routes
app.get("/*", (req, res) => {
  res.send(`Request received: ${req.method} - ${req.path}`);
});

const twiml =
  '<Response><Receive action="/fax/payload" method="POST" storeMedia="false" /></Response>';

app.post(
  "/fax/sent",
  bodyParser.urlencoded({ extended: false }),
  (req, res) => {
    console.log(` in /fax/sent 1 Time ${Date.now()}`);
    console.log(
      `(initialize): Incoming fax request. FaxSID:${req.body.FaxSid}, From:${req.body.From}`
    );
    res.type("text/xml").send(twiml);
  }
);
app.post("/fax/payload", upload, (req, res) => {
  console.log(
    `Time 2 ${Date.now()} (payload): Incoming fax data. FaxSID:${
      req.body.FaxSid
    }, From:${req.body.From}`
  );

  let myFile = req.file.originalname.split(".");
  const fileType = myFile[myFile.length - 1];

  const params = {
    Bucket: "faxes",
    Key: `fax-${Date.now()}.${fileType}`,
    Body: req.file.buffer,
  };

  s3.upload(params, (error, data) => {
    console.log(`Time  3${Date.now()}`);
    console.log(`error ${error} data${data}`);
    if (error) {
      res.status(500).send(error);
    }
    res.status(200).send(data);
  });
});
// Error handler
app.use((err, req, res) => {
  console.error(err);
  res.status(500).send("Internal Serverless Error");
});

module.exports = app;
