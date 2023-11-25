require("dotenv").config();

const defaultUserId = "default";

function createDynamoDBClient() {
  const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
  const {
    PutCommand,
    DeleteCommand,
    QueryCommand,
    DynamoDBDocumentClient,
  } = require("@aws-sdk/lib-dynamodb");
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const tableName = process.env.QUEUE_TABLE_NAME;
  return {
    get: async (userId = defaultUserId) => {
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: {
          ":id": userId,
        },
      });
      const res = await docClient.send(command);
      return res.Items;
    },
    push: async (item, userId = defaultUserId) => {
      console.log(`Pushing item to queue: ${JSON.stringify(item)}`);
      const command = new PutCommand({
        TableName: tableName,
        Item: {
          userId,
          createdAt: Date.now(),
          data: item,
        },
      });
      const res = await docClient.send(command);
      console.log(`Response from DynamoDB: ${JSON.stringify(res)}`);
    },
    pop: async (userId = defaultUserId) => {
      console.log("Popping item from queue");
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        Limit: 1,
      });
      const resPop = await docClient.send(command);
      console.log(`Response from DynamoDB get latest item: ${JSON.stringify(resPop)}`);
      const item = resPop.Items[0];
      // Delete the item from the queue
      const deleteCommand = new DeleteCommand({
        TableName: tableName,
        Key: {
          userId: item.userId,
          createdAt: item.createdAt,
        },
      });
      const resDelete = await docClient.send(deleteCommand);
      console.log(`Response from DynamoDB delete item: ${JSON.stringify(resDelete)}`);
      console.log(`Popped item from queue: ${JSON.stringify(item)}`);
      return item.data;
    },
  };
}

function createLocalFileClient() {
  const fs = require("fs");
  const path = require("path");
  const dbPath = process.env.QUEUE_FILE || path.join(__dirname, "queue.json");

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, "[]");
  }
  const queue = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  return {
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
}

module.exports = {
  createDynamoDBClient,
  createLocalFileClient,
};
