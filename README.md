# ALI Plugins

Each folder in this directory is an independent plugin repository, registered here as a git submodule.

---

## Adding a new plugin

### 1. Create the GitHub repo

Go to [github.com/Agentic-Local-Intelligence](https://github.com/Agentic-Local-Intelligence) and create a new repository named `<name>-plugin` (e.g. `tts-plugin`). Keep it empty — no README, no .gitignore.

---

### 2. Create the local folder and initialize it

```bash
cd plugins/<name>
git init
git remote add origin https://github.com/Agentic-Local-Intelligence/<name>-plugin.git
```

---

### 3. Create the required files

**`plugin.json`** — manifest (required):
```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "version": "1.0.0",
  "description": "What this plugin does",
  "main": "index.js",
  "dependencies": {
    "core": "*"
  }
}
```

**`index.js`** — entry point (required):
```js
'use strict';

module.exports = {
    install(ctx) {
        const log    = ctx.use('log');
        const events = ctx.use('events');
        const config = ctx.use('config');

        // Register a WebSocket message handler
        ctx.onMessage('myplugin:hello', (socket, msg) => {
            ctx.reply(socket, { type: 'myplugin:hello:response', ok: true });
        });

        log('my-plugin loaded');
    }
};
```

**`package.json`**:
```json
{
  "name": "@ali/plugin-<name>",
  "version": "1.0.0",
  "description": "...",
  "main": "index.js",
  "type": "commonjs",
  "private": true
}
```

**`.gitignore`**:
```
node_modules/
```

---

### 4. Commit and push the plugin repo

```bash
cd plugins/<name>
git add .
git commit -m "init <name> plugin"
git push -u origin master
```

---

### 5. Register it as a submodule inside `plugins/`

```bash
cd plugins/
git submodule add https://github.com/Agentic-Local-Intelligence/<name>-plugin.git <name>
git commit -m "add <name> as submodule"
git push
```

---

### 6. Update the main repo to point to the new plugins commit

```bash
cd ..   # back to installer-website root
git add plugins
git commit -m "update plugins submodule — add <name>"
git push
```

---

## Plugin context API

Every plugin receives a `ctx` object in its `install(ctx)` function:

| Method / Property | Description |
|---|---|
| `ctx.use('log')` | Logger: `log(msg, level?)` |
| `ctx.use('events')` | EventEmitter shared across all plugins |
| `ctx.use('config')` | Persistent config: `.get(key, default)` / `.set(key, value)` / `.all()` |
| `ctx.use('ui.registerPanel')` | `(id, htmlPath, title?)` — register an HTML panel (requires `ui` plugin) |
| `ctx.use('ui.openPanel')` | `(id?)` — open a panel in the default browser (requires `ui` plugin) |
| `ctx.provide('key', value)` | Expose a service for other plugins to consume |
| `ctx.onMessage(type, handler)` | Register a WebSocket message handler: `handler(socket, msg)` |
| `ctx.reply(socket, obj)` | Send a JSON response to one client |
| `ctx.broadcast(obj)` | Send a JSON message to all connected clients |
| `ctx.loadedPlugins()` | Returns `{ id: { name, version } }` map of all loaded plugins |
| `ctx.appName` | The installed app name |
| `ctx.appVersion` | The installed app version |
| `ctx.dataDir` | Absolute path to the `data/` directory |

Dependencies listed in `plugin.json` are loaded first. Load order: `core` → `ui` → everything else alphabetically.

---

## Cloning this repo with all submodules

```bash
git clone --recurse-submodules https://github.com/Agentic-Local-Intelligence/plugins.git

# Already cloned without submodules?
git submodule update --init --recursive

# Pull latest from all submodule remotes
git submodule update --remote --merge
```

---

## Plugin categories

The `[category]/` folder is a template placeholder — it shows the intended folder structure for organizing plugins by type. It is not a plugin and should not have a `git init`.
