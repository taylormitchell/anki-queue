import fs from "fs";
import path from "path";
import axios from "axios";

const token = JSON.parse(fs.readFileSync(path.join(process.env.HOME, ".secrets.json"))).QUEUE_TOKEN;
const queueURL = process.env.QUEUE_URL || "http://localhost:3000/queue";
const ankiURL = process.env.ANKI_URL || "http://localhost:8765";
const version = 6;

// get from queue

while (true) {
  const res = await axios.get(queueURL, {
    headers: {
      Authorization: token,
    },
  });
  if (!res.data) {
    console.log("No more items in queue");
    break;
  }
  console.log("Adding to Anki: ", res.data);
  await axios
    .post(ankiURL, { ...res.data, version })
    .then(({ data }) => {
      if (data.error) {
        console.log("Error: ", data.error);
      } else {
        console.log("Success: ", data.result);
      }
    })
    .catch(console.error);
}
