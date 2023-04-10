import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const secret = process.env.QUEUE_SECRET;
const queueURL = process.env.QUEUE_URL || "http://localhost:3000/queue";
const ankiURL = process.env.ANKI_URL || "http://localhost:8765";
const version = 6;

while (true) {
  // use DELETE to pop from queue
  const res = await axios.delete(queueURL, {
    headers: {
      Authorization: secret,
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
