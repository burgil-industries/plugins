# Guide 01 — Creating Your First Plugin

This guide walks you through building a minimal plugin from scratch.

## What you'll build

A plugin called `hello` that:
- Reads a greeting name from persistent config
- Writes a log entry on startup
- Exposes a `hello.greet` service other plugins can call

## 1. Create the folder and files

```
plugins/hello/
  plugin.json
  index.js
```

**`plugin.json`:**
```json
{
  "id": "hello",
  "name": "Hello",
  "version": "1.0.0",
  "description": "Greets the world.",
  "main": "index.js",
  "dependencies": { "core": "*" },
  "permissions": [
    "fs.read:${dataDir}",
    "fs.write:${dataDir}",
    "ctx.provide"
  ]
}
```

**`index.js`:**
```js
'use strict';

module.exports = {
    install(ctx) {
        const log    = ctx.use('log');
        const config = ctx.use('config');

        const name = config.get('hello.name', 'World');
        log(`Hello, ${name}!`);

        ctx.provide('hello.greet', (who) => {
            log(`Hello, ${who}!`);
            return `Hello, ${who}!`;
        });

        log('hello plugin loaded');
    },
};
```

## 2. Declare the dependency

Any plugin that wants to call `hello.greet` must list `hello` in its dependencies:

```json
"dependencies": { "core": "*", "hello": "*" }
```

Then use it:

```js
const greet = ctx.use('hello.greet');
greet('Alice');   // logs: Hello, Alice!
```

## 3. Change the greeting via config

The `core` config persists to `data/plugins/core/config.json`. Set it from another plugin:

```js
const config = ctx.use('config');
config.set('hello.name', 'COMPUTER');
```

Or edit the file directly and restart.

## 4. Test it

Drop the folder into `plugins/`, restart the app. The permission dialog appears once:

```
Hello allows:
  • Write files to your computer   (data/plugins/hello/)
  • Read files from your computer  (data/plugins/hello/)
  • Provide services to other plugins
```

Click **Allow**. You should see in the console:

```
[INFO] Hello, World!
[INFO] hello plugin loaded
```

## Next steps

- → [02 — Permissions deep dive](02-permissions.md)
- → [03 — Events & hooks](03-events-hooks.md)
