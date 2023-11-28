# Anki Queue

A queue for Anki actions. Anki has an API with the AnkiConnect plugin, but it is only available when Anki is open.
This allows you to queue up actions and then consume them when Anki is open.

## Deployment

Run the server (e.g. https://replit.com/@taylormitchell/anki-queue)

```
node queue/server.js
```

Run the consumer in a cron job on the machine with Anki installed

```
echo "0 12 * * * cd /path/to/anki-queue; source scripts/consume.sh" | crontab -
```

## Development usage

Start the queue server

```
node queue/server.js
```

Enqueue and dequeue an action

```
bash ./scripts/enqueue.sh '{"action": "deckNames"}'
bash ./scripts/dequeue.sh
```

Enqueue, dequeue, and send to Anki

```
bash ./scripts/enqueue.sh '{"action": "deckNames"}'
node ./consume/index.js
```

## Todo

- [ ] Add authentication to the server
- [ ] Connect gpt to it
- [ ] Add cron job to consume queue periodically
