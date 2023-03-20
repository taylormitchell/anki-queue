# Anki Queue

This is a simple queue server for anki. It allows you to queue up anki actions and then consume them.
AnkiConnect is only available when Anki is open. This allows you to queue up actions and then consume them when Anki is open.

## Basic Usage

Start the queue server

```
node queue/index.js
```

Post an anki action to it

```
curl -X POST -H "Content-Type: application/json" -d '{"action": "deckNames"}' http://localhost:3000/queue
```

Consume the action and send to ankiconnect

```
node queue/index.js
```
