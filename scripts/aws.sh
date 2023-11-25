#!/bin/bash

# Variables
source .env
tableName=$QUEUE_TABLE_NAME
region="us-east-1"
accountID="504625865506"
lambdaFunctionName="AnkiQueue"
lambdaRoleName="AnkiQueueRole"
lambdaRuntime="nodejs14.x"
zipFilePath="/path/to/your/zip/file" # Path to the zipped file of your Express app

# 1. Create DynamoDB Table
if aws dynamodb describe-table --table-name $tableName --region $region 2>&1 | grep -q 'ResourceNotFoundException'
then
    echo "Table $tableName does not exist. Creating..."
    aws dynamodb create-table \
        --table-name $tableName \
        --attribute-definitions \
            AttributeName=userId,AttributeType=S \
            AttributeName=createdAt,AttributeType=N \
        --key-schema \
            AttributeName=userId,KeyType=HASH \
            AttributeName=createdAt,KeyType=RANGE \
        --provisioned-throughput \
            ReadCapacityUnits=1,WriteCapacityUnits=1 \
        --region $region
else
    echo "Table $tableName already exists. Skipping..."
fi


# 2. Create IAM Role for Lambda
trustPolicy='{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}'
if aws iam get-role --role-name $lambdaRoleName 2>&1 | grep -q 'NoSuchEntity'
then
    echo "Role $lambdaRoleName does not exist. Creating..."
    aws iam create-role \
        --role-name $lambdaRoleName \
        --assume-role-policy-document "$trustPolicy" 
    # Wait a bit to ensure IAM role is created
    sleep 10
else
    echo "Role $lambdaRoleName already exists. Skipping..."
fi

# 3. Attach Custom Policy to Lambda Role
policyName="${tableName}DynamoDBReadWriteAccess"
policyDocument='{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:DeleteItem",
                "dynamodb:GetItem",
                "dynamodb:Scan",
                "dynamodb:Query",
                "dynamodb:UpdateItem"
            ],
            "Resource": "arn:aws:dynamodb:'$region':'$accountID':table/'$tableName'"
        }
    ]
}'
if aws iam list-attached-role-policies --role-name $lambdaRoleName | grep -q $policyName
then
    echo "Custom policy already attached to $lambdaRoleName. Skipping..."
else
    echo "Attaching custom policy to $lambdaRoleName..."
    policyArn=$(aws iam create-policy \
        --policy-name $policyName \
        --policy-document "$policyDocument" \
        --query 'Policy.Arn' --output text)
    aws iam attach-role-policy \
        --role-name $lambdaRoleName \
        --policy-arn $policyArn
fi


# 4. Create the Lambda Function
# aws lambda create-function \
#     --function-name $lambdaFunctionName \
#     --zip-file fileb://$zipFilePath \
#     --handler app.handler \
#     --runtime $lambdaRuntime \
#     --role arn:aws:iam::$accountID:role/$lambdaRoleName \
#     --region $region


# aws dynamodb put-item \
#     --table-name AnkiQueue \
#     --item \
#         '{"id": {"S": "unique-id"}, "createdAt": {"N": "1700930073"}, "data": {"M": {"Front": {"S": "test"}, "Back": {"S": "test"}}}}' \
#     --return-consumed-capacity TOTAL
