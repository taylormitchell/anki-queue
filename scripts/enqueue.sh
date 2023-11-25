source .env
curl -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: $QUEUE_SECRET" \
    -d "$1" $QUEUE_URL