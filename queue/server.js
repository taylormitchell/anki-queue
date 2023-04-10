const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();
const queue = require("./queue");

const app = express();
const port = process.env.PORT || 3000;
const secret = process.env.QUEUE_SECRET;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/", (req, res) => {
  const { question, answer, source } = req.body;
  if (!question || !answer) {
    res.status(400).send("Bad request");
    return;
  }
  queue.push({
    action: "addNote",
    version: 6,
    params: {
      note: {
        deckName: "2-Recent",
        modelName: "Basic",
        fields: {
          Front: question,
          Back: answer,
          SourceId: source || "",
        },
      },
    },
  });
  res.sendFile(__dirname + "/index.html");
});

// Middleware to check for secret
app.use((req, res, next) => {
  if (secret && req.headers.authorization !== secret) {
    res.status(401).send("Unauthorized");
  } else {
    next();
  }
});

app.post("/queue", (req, res) => {
  let note = {};
  if (!req.body) {
    res.status(400).send("Bad request");
    return;
  } else if (req.body?.action) {
    note = req.body;
  } else {
    note = {
      action: "addNote",
      version: 6,
      params: {
        note: {
          deckName: "2-Recent",
          modelName: "Basic",
          fields: {
            Front: "",
            Back: "",
            SourceId: "",
            ...req.body,
          },
        },
      },
    };
  }
  queue.push(note);
  res.json(note);
});

app.get("/queue", (req, res) => {
  res.json(queue.get());
});

// pop from queue
app.delete("/queue", (req, res) => {
  res.json(queue.pop());
});

app.listen(port, () => {
  console.log(`Queue API listening at http://localhost:${port}`);
});
