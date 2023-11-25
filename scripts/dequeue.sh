source .env
curl -X DELETE -H "Authorization: $QUEUE_SECRET" $QUEUE_URL