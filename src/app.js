require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { createDynamoDBClient, createLocalFileClient } = require("./queue");

// Create queue client
const secret = process.env.QUEUE_SECRET;
const env = process.env.ENV || "prod";
console.log(`ENV: ${env}`);
let queue;
if (env === "dev") {
  queue = createLocalFileClient(process.env.FILE_NAME || "queue.json");
} else {
  if (!process.env.TABLE_NAME) {
    console.error("TABLE_NAME env var is required for local development");
    process.exit(1);
  }
  queue = createDynamoDBClient(process.env.TABLE_NAME);
}

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

async function getHtml() {
  const items = await queue.get();
  // Return index w/ root replaced with queue
  const html = `
    <html>
      <head>
        <title>Queue</title>
      </head>
      <body>
        <h1>Queue</h1>
        <ul>
          ${items.map((item) => `<li>${JSON.stringify(item)}</li>`)}
        </ul>
          <form action="/" method="POST">
          <div>
          <label for="question">Q:</label>
          <input type="text" name="question" id="question" />
        </div>
        <div>
          <label for="answer">A:</label>
          <input type="text" name="answer" id="answer" />
        </div>
        <input type="submit" value="Create" />
        <button type="button" onclick="window.location.href='/queue/flush'">Flush</button>
      </form>
      </body>
    </html>
  `;
  return html;
}

app.get("/", async (req, res) => {
  const html = await getHtml();
  return res.send(html);
});

app.post("/", async (req, res) => {
  const { question, answer, source } = req.body;
  if (!question || !answer) {
    res.status(400).send("Bad request");
    return;
  }
  await queue.push({
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
  const html = await getHtml();
  return res.send(html);
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
  console.log("POST /queue");
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
  console.log(`Pushing item to queue: ${JSON.stringify(note)}`);
  queue.push(note);
  res.json(note);
});

app.use("/queue/flush", async (req, res) => {
  console.log("POST /queue/flush");
  const items = await queue.flush();
  res.send(items);
});

app.get("/queue", async (req, res) => {
  console.log("GET /queue");
  const items = await queue.get();
  console.log(`Queue: ${JSON.stringify(items)}`);
  res.json(items);
});

// pop from queue
app.delete("/queue", (req, res) => {
  console.log("DELETE /queue");
  res.json(queue.pop());
});

module.exports = app;
