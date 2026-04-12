# COMPUTER Plugins

Each folder in this directory is an independent plugin repository, registered here as a git submodule.

---

## Table of Contents

- [How plugins run](#how-plugins-run--the-vm-sandbox)
- [Quick start](#quick-start--example-plugin)
- [Adding a new plugin](#adding-a-new-plugin)
- [Plugin context API](#plugin-context-api)
- [Permissions](#permissions)
- [Bundles](#bundles)
- [Events & hooks system](#events--hooks-system)
- [Providing & consuming services](#providing--consuming-services)
- [Built-in plugins](#built-in-plugins)
- [Plugin Manager](#plugin-manager)
- [Plugin packages](#plugin-packages)
- [Cloning with submodules](#cloning-this-repo-with-all-submodules)
- [Developer guides](#developer-guides)

---

## How plugins run — the VM sandbox

When the app starts (`__APP_NAME__.cmd` → `node src/app.js`), the VM loader (`src/vm.js`) scans the `plugins/` directory. For each plugin it:

1. Reads `plugin.json` to get the requested permissions.
2. **Permission dialog** — if the plugin has never run before, a dialog lists every permission in plain English. The user clicks **Allow** or **Deny**. The decision is saved to `data/permissions/<id>.json` and never asked again.
3. Runs `index.js` inside a Node.js `vm` sandbox — no `fs`, `net`, `child_process`, or `process` globals are accessible unless you declared and were granted the matching permission.
4. Calls `plugin.install(ctx)` with a `ctx` object that exposes only the APIs covered by the granted permissions.

> **Upgrading isolation:** the sandbox uses Node's built-in `vm` module. For a fully separate V8 heap (zero prototype-chain escape risk) it can be swapped to [`isolated-vm`](https://github.com/laverdet/isolated-vm) without any changes to plugin code — the `ctx` API stays the same.

---

## Quick start — example plugin

See [`example/`](example/) for the minimal working plugin:

```js
// example/index.js
'use strict';
const path = require('path');

module.exports = {
    install(ctx) {
        const log = ctx.use('log');

        const greetFile = path.join(ctx.dataDir, 'hello.txt');
        ctx.writeFile(greetFile, `Hello at ${new Date().toISOString()}\n`);

        const content = ctx.readFile(greetFile);
        log(`example: ${content.trim()}`);
    }
};
```

```json
// example/plugin.json
{
  "id": "example",
  "name": "Example",
  "version": "1.0.0",
  "description": "Minimal example plugin",
  "main": "index.js",
  "dependencies": { "core": "*" },
  "permissions": [
    "fs.read:${dataDir}",
    "fs.write:${dataDir}"
  ]
}
```

`${dataDir}` expands to `<install_dir>/data/plugins/example/` — the plugin's private data directory, created automatically on first load.

> To reset a plugin's permission decision, open the **Plugin Manager** at `http://127.0.0.1:53421/manager` and click **Reset perms**, or delete `<install_dir>/data/permissions/<id>.json` and restart.

---

## Adding a new plugin

### 1. Create the GitHub repo

Go to [github.com/burgil-industries](https://github.com/burgil-industries) and create a new repository named `<name>-plugin` (e.g. `tts-plugin`). Keep it empty — no README, no .gitignore.

### 2. Create the local folder and initialize it

```bash
cd plugins/<name>
git init
git remote add origin https://github.com/burgil-industries/<name>-plugin.git
```

### 3. Create the required files

**`plugin.json`** — manifest (required):
```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "version": "1.0.0",
  "description": "What this plugin does",
  "main": "index.js",
  "dependencies": { "core": "*" },
  "permissions": [
    "fs.read:${dataDir}",
    "ctx.provide"
  ]
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

        log('my-plugin loaded');
    }
};
```

**`package.json`**:
```json
{
  "name": "plugin-<name>",
  "version": "1.0.0",
  "main": "index.js",
  "type": "commonjs",
  "private": true
}
```

### 4–6. Push and register as submodule

```bash
# 4. Push plugin repo
cd plugins/<name>
git add . && git commit -m "init <name> plugin" && git push -u origin master

# 5. Register as submodule
cd ..
git submodule add https://github.com/burgil-industries/<name>-plugin.git <name>
git commit -m "add <name> as submodule"

# 6. Update main repo
cd ..
git add plugins && git commit -m "update plugins submodule - add <name>" && git push
```

---

## Plugin context API

Every plugin receives a `ctx` object in `install(ctx)`.

### Always available (no permission needed)

| Property / Method | Description |
|---|---|
| `ctx.pluginId` | This plugin's ID string |
| `ctx.pluginDir` | Absolute path to this plugin's source folder |
| `ctx.dataDir` | Absolute path to `data/plugins/<id>/` (private data dir) |
| `ctx.appName` | Installed app name |
| `ctx.appVersion` | Installed app version |
| `ctx.loadedPlugins()` | Array of all currently-loaded plugin IDs |
| `ctx.use('key')` | Consume a service provided by another plugin |
| `ctx.onMessage(type, handler)` | Register a WebSocket message handler |
| `ctx.reply(socket, obj)` | Send a JSON response to one client |

### Permission-gated methods

| Method | Required Permission | Description |
|---|---|---|
| `ctx.provide('key', value)` | `ctx.provide` | Expose a service for other plugins |
| `ctx.broadcast(obj)` | `ctx.broadcast` | Send to all WS clients |
| `ctx.readFile(path)` | `fs.read` or `fs.read:<path>` | Read a file as UTF-8 |
| `ctx.readFileBuffer(path)` | `fs.read` or `fs.read:<path>` | Read a file as Buffer |
| `ctx.writeFile(path, data)` | `fs.write` or `fs.write:<path>` | Write a file (creates dirs) |
| `ctx.existsSync(path)` | `fs.read` or `fs.read:<path>` | Check if a path exists |
| `ctx.readDir(path)` | `fs.read` or `fs.read:<path>` | List directory contents |
| `ctx.listen(port, handler)` | `net.listen` or `net.listen:<port>` | Start an HTTP server |
| `ctx.fetch(url, options)` | `net.connect` or `net.connect:<host>` | Outbound HTTP request |
| `ctx.exec(cmd, args)` | `system.exec` or `system.exec:<cmd>` | Run command (sync) |
| `ctx.execAsync(cmd)` | `system.exec` or `system.exec:<cmd>` | Run command (async) |
| `ctx.spawnDetached(cmd, args)` | `system.exec` or `system.exec:<cmd>` | Fire-and-forget background process |
| `ctx.use('vm')` | `vm.manage` | VM control API (see [Plugin Manager](#plugin-manager)) |

---

## Permissions

Declare required permissions in `plugin.json` under `permissions`. `${dataDir}` expands to the app's data directory at load time.

### Permission format

```
category.action           # Wildcard — grants all scopes
category.action:scope     # Scoped — grants only the matching scope
```

### Available permissions

| Permission | Description |
|---|---|
| `fs.read` | Read any file |
| `fs.read:<path>` | Read files under a specific path |
| `fs.write` | Write any file |
| `fs.write:<path>` | Write files under a specific path |
| `net.listen` | Listen on any port |
| `net.listen:<port>` | Listen on a specific port |
| `net.connect` | Connect to any host |
| `net.connect:<host>` | Connect to a specific host |
| `system.exec` | Execute any child process |
| `system.exec:<cmd>` | Execute a specific command |
| `ctx.provide` | Register services for other plugins |
| `ctx.broadcast` | Broadcast to all WS clients |
| `vm.manage` | Access VM control API |

A permission without a scope grants all scopes. Path-scoped permissions also match subdirectories: `fs.write:/data` grants write access to `/data/config.json`.

---

## Bundles

A **bundle** groups multiple plugins under one merged permission dialog. Create a `bundle.json` (not `plugin.json`) in a folder:

```json
// plugins/essentials/bundle.json
{
  "id": "essentials",
  "name": "COMPUTER Essentials",
  "version": "1.0.0",
  "description": "The core foundation every COMPUTER installation needs.",
  "plugins": ["core", "ui", "settings"]
}
```

The dialog groups each member's permissions under a header showing its name. On approval, each member's permissions are saved individually so they can also be loaded standalone.

---

## Events & hooks system

The `core` plugin provides a central **EventBus** (`EventEmitter`) via `ctx.use('events')`. This is the equivalent of WordPress actions and filters.

```js
install(ctx) {
    const events = ctx.use('events');

    // Subscribe to an event (like add_action)
    events.on('my-plugin:data', ({ payload }) => {
        console.log('got:', payload);
    });

    // Publish an event (like do_action)
    events.emit('my-plugin:data', { payload: 'hello' });
}
```

### Well-known system events

| Event | Emitted by | Payload |
|---|---|---|
| `core:log` | `core` | `{ level, msg, line }` |
| `ui:ready` | `ui` | `{ port }` |
| `ui:panel:registered` | `ui` | `{ id, title }` |
| `settings:changed` | `settings` | `{ key, value }` |
| `vm:broadcast` | VM runtime | raw broadcast object |

### Overriding / filtering (WordPress-style)

Use the **service layer** to wrap and override: the last `ctx.provide` for a given key wins.

```js
// interceptor-plugin/index.js — overrides the logger
install(ctx) {
    const original = ctx.use('log');
    ctx.provide('log', (msg, level = 'INFO') => {
        if (level === 'DEBUG') return;   // filter out debug messages
        original('[intercepted] ' + msg, level);
    });
}
```

---

## Providing & consuming services

`ctx.provide(key, value)` registers a value (function, object, etc.) that other plugins can retrieve with `ctx.use(key)`. Dependencies in `plugin.json` are always loaded first.

```js
// producer/index.js
install(ctx) {
    ctx.provide('greeter', (name) => `Hello, ${name}!`);
}

// consumer/index.js — dependencies: { "producer": "*" }
install(ctx) {
    const greet = ctx.use('greeter');
    console.log(greet('World'));   // Hello, World!
}
```

### Services from built-in plugins

| Key | Provided by | Type |
|---|---|---|
| `log` | `core` | `(msg, level?) => void` |
| `events` | `core` | `EventEmitter` |
| `config` | `core` | `{ get(k, def?), set(k, v), all() }` |
| `ui.registerPanel` | `ui` | `(id, source, title?) => void` — `source` is a file path or `http://` URL |
| `ui.openPanel` | `ui` | `(id?) => void` |
| `vm` | VM runtime | Management API — requires `vm.manage` permission |

---

## Built-in plugins

| Plugin | Port | Description |
|---|---|---|
| [`core`](core/) | — | Event bus, persistent config, logger |
| [`ui`](ui/) | 53421 | HTTP panel server, panel registration |
| [`settings`](settings/) | — | Settings panel at `/settings` |
| [`manager`](manager/) | 53422 | Plugin manager UI at `/manager` |
| [`tray`](tray/) | — | Windows system tray icon |
| [`example`](example/) | — | Minimal demo plugin |

---

## Plugin Manager

The `manager` plugin provides a txAdmin-style web UI at `http://127.0.0.1:53421/manager`.

**Features:**
- Live plugin list with status badges (Loaded / Disabled / Error / Denied / Bundle)
- Toggle each plugin on or off
- **Dependency-aware disable** — disabling a plugin that others depend on shows a confirmation modal listing every affected plugin before proceeding
- **Reset perms** — clears saved permissions so the dialog re-appears on next load
- Search + filter by status

**VM control API** (requires `vm.manage` permission in your `plugin.json`):

```js
const vm = ctx.use('vm');

vm.getAll()          // plugin descriptors: id, name, status, dependencies, dependents, …
vm.getDependents(id) // transitive list of plugin IDs that depend on `id`
vm.disable(id)       // { ok, restart_required }
vm.enable(id)        // Promise<{ ok, loaded }>
vm.resetPerms(id)    // Promise<{ ok }>
vm.getLoaded()       // array of currently-loaded plugin IDs
```

---

## Plugin packages

Packages are curated bundles defined in `public/packages/index.json` and shown in the marketplace UI:

```json
{
  "id": "essentials",
  "name": "COMPUTER Essentials",
  "version": "1.0.0",
  "description": "The core foundation every COMPUTER installation needs.",
  "author": "COMPUTER Systems",
  "icon": "box",
  "plugins": ["core", "ui", "settings"],
  "tags": ["core", "official"]
}
```

---

## Cloning this repo with all submodules

```bash
git clone --recurse-submodules https://github.com/burgil-industries/plugins.git

# Already cloned without submodules?
git submodule update --init --recursive

# Pull latest from all submodule remotes
git submodule update --remote --merge
```

---

## Developer guides

Detailed guides are in [`docs/`](docs/):

| Guide | Description |
|---|---|
| [01 — First plugin](docs/01-first-plugin.md) | Step-by-step walkthrough |
| [02 — Permissions](docs/02-permissions.md) | Scopes, wildcards, security model |
| [03 — Events & hooks](docs/03-events-hooks.md) | Full EventBus API, override patterns |
| [04 — Building a panel UI](docs/04-panel-ui.md) | Registering panels, serving assets |
| [05 — Bundles](docs/05-bundles.md) | Grouping plugins, merged permission dialog |
| [06 — VM control API](docs/06-vm-manage.md) | Enable/disable at runtime, dependency graph |

---

## Plugin categories

The `[category]/` folder is a template placeholder showing the intended folder structure for organizing plugins by type. It is not a plugin and should not have a `git init`.
