const fs = require("fs");
const path = require("path");
const dbPath = process.env.QUEUE_FILE || path.join(__dirname, "queue.json");
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, "[]");
}
const queue = JSON.parse(fs.readFileSync(dbPath, "utf8"));
module.exports = {
  get: () => queue,
  push: (item) => {
    queue.push(item);
    fs.writeFileSync(dbPath, JSON.stringify(queue, null, 2));
  },
  pop: () => {
    const item = queue.shift();
    fs.writeFileSync(dbPath, JSON.stringify(queue, null, 2));
    return item;
  },
};
