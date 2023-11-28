require("dotenv").config();

const defaultUserId = "default";

function createDynamoDBClient(tableName) {
  const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
  const {
    PutCommand,
    DeleteCommand,
    QueryCommand,
    DynamoDBDocumentClient,
  } = require("@aws-sdk/lib-dynamodb");
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);
  const queue = {
    get: async (userId = defaultUserId) => {
      const command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      });
      const res = await docClient.send(command);
      console.log(JSON.stringify({ command, res }));
      return res.Items;
    },
    push: async (item, userId = defaultUserId) => {
      const command = new PutCommand({
        TableName: tableName,
        Item: {
          userId,
          createdAt: Date.now(),
          data: item,
        },
      });
      const res = await docClient.send(command);
      console.log(JSON.stringify({ command, res }));
    },
    pop: async (userId = defaultUserId) => {
      console.log("Popping item from queue");
      const queryCommand = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        Limit: 1,
      });
      const resPop = await docClient.send(command);
      console.log(JSON.stringify({ command: queryCommand, res: resPop }));
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
      console.log(JSON.stringify({ command: deleteCommand, res: resDelete }));
      return item.data;
    },
    flush: async (userId = defaultUserId) => {
      console.log("Flushing queue");
      const items = await queue.get(userId);
      Promise.all(
        items.map((item) => {
          const deleteCommand = new DeleteCommand({
            TableName: tableName,
            Key: {
              userId: item.userId,
              createdAt: item.createdAt,
            },
          });
          const resDelete = docClient.send(deleteCommand);
          console.log(JSON.stringify({ command: deleteCommand, res: resDelete }));
        })
      );
      return items;
    },
  };
  return queue;
}

function createLocalFileClient(dbPath) {
  const fs = require("fs");
  const path = require("path");

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
