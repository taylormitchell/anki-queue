#!/bin/bash
set -e

# Variables
source .env
tableName=$TABLE_NAME
region="us-east-1"
accountID="504625865506"
lambdaFunctionName="AnkiQueue"
lambdaRoleName="AnkiQueueRole"
zipFilePath="build.zip" # Path to the zipped file of your Express app

# # Create DynamoDB Table
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


# Create IAM Role for Lambda
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
policyName="${tableName}Policy"
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
        },
        {
            "Sid": "CloudWatchLogsAccess",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:'$region':'$accountID':log-group:/aws/lambda/'$lambdaFunctionName':*"
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
    # 
fi

# Build the project
rm $zipFilePath
cd src && npm install
# zip src and .env
zip -r ../$zipFilePath * ../.env
cd ..

# Create the Lambda Function
if aws lambda get-function --function-name $lambdaFunctionName 2>&1 | grep -q 'ResourceNotFoundException'
then
    echo "Lambda function $lambdaFunctionName does not exist. Creating..."
    aws lambda create-function \
        --function-name $lambdaFunctionName \
        --zip-file fileb://$zipFilePath \
        --handler serverless.handler \
        --runtime nodejs14.x \
        --role arn:aws:iam::$accountID:role/$lambdaRoleName \
        --region $region
    aws lambda create-function-url-config \
        --function-name $lambdaFunctionName \
        --auth-type NONE
    aws lambda add-permission \
        --function-name $lambdaFunctionName \
        --statement-id FunctionURLAllowPublicAccess \
        --action lambda:InvokeFunctionUrl \
        --principal '*' \
        --function-url-auth-type NONE
else
    echo "Lambda function $lambdaFunctionName already exists. Updating..."
    aws lambda update-function-code \
        --function-name $lambdaFunctionName \
        --zip-file fileb://$zipFilePath \
        --region $region
fi
