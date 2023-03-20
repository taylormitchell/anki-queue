const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const secret = process.env.SECRET;

app.use(bodyParser.json());

const queue = [];

// Middleware to check for secret
app.use((req, res, next) => {
  if (secret && req.headers.authorization !== secret) {
    res.status(401).send("Unauthorized");
  } else {
    next();
  }
});

app.post("/queue", (req, res) => {
  queue.push(req.body);
  res.send("Object added to queue");
});

app.get("/queue", (req, res) => {
  res.json(queue.shift());
});

app.listen(port, () => {
  console.log(`Queue API listening at http://localhost:${port}`);
});
