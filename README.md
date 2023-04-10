# Anki Queue

A queue for Anki actions. Anki has an API with the AnkiConnect plugin, but it is only available when Anki is open.
This allows you to queue up actions and then consume them when Anki is open.

## Basic Usage

Start the queue server

```
node queue/server.js
```

Enqueue and dequeue an action

```
source ./scripts/enqueue.sh '{"action": "deckNames"}'
source ./scripts/dequeue.sh
```

Enqueue, dequeue, and send to Anki

```
source ./scripts/enqueue.sh '{"action": "deckNames"}'
node ./consume/index.js
```
