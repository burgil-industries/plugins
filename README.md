# COMPUTER Plugins

Each folder in this directory is an independent plugin repository, registered here as a git submodule.

---

## How plugins run — the VM sandbox

When the app starts (`__APP_NAME__.cmd` → `node src/app.js`), the VM loader (`src/vm.js`) scans the `plugins/` directory. For each plugin it:

1. Reads `plugin.json` to get the requested permissions.
2. **Permission dialog** — if the plugin has never run before, a Windows dialog lists every permission in plain English. The user clicks **Allow** or **Deny**. The decision is saved to `data/permissions/<id>.json` and never asked again.
3. Runs `index.js` inside a Node.js `vm` sandbox — no `fs`, `net`, `child_process`, or `process` globals are accessible unless you declared and were granted the matching permission.
4. Calls `plugin.install(ctx)` with a `ctx` object that exposes only the APIs covered by the granted permissions.

> **Upgrading isolation:** the sandbox uses Node's built-in `vm` module. For a fully separate V8 heap (zero prototype-chain escape risk) it can be swapped to [`isolated-vm`](https://github.com/laverdet/isolated-vm) without any changes to plugin code — the `ctx` API stays the same.

---

## Quick start — example plugin

See [`example/`](example/) for the minimal working plugin. It declares two permissions, depends on `core`, writes a timestamped file to its private data dir, and logs the result:

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

`${dataDir}` expands to `<install_dir>/data/plugins/example/` — the plugin's private data directory, created automatically on first load. The plugin logs this path at startup so you can find your files:

```
[INFO] example: data dir -> C:\Users\…\COMPUTER\data\plugins\example
[INFO] example: wrote    -> C:\Users\…\COMPUTER\data\plugins\example\hello.txt
```

> To reset a plugin's permission decision, delete `<install_dir>/data/permissions/<id>.json` and restart the app — the dialog will appear again.

---

## Adding a new plugin

### 1. Create the GitHub repo

Go to [github.com/burgil-industries](https://github.com/burgil-industries) and create a new repository named `<name>-plugin` (e.g. `tts-plugin`). Keep it empty - no README, no .gitignore.

---

### 2. Create the local folder and initialize it

```bash
cd plugins/<name>
git init
git remote add origin https://github.com/burgil-industries/<name>-plugin.git
```

---

### 3. Create the required files

**`plugin.json`** - manifest (required):
```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "version": "1.0.0",
  "description": "What this plugin does",
  "main": "index.js",
  "dependencies": {
    "core": "*"
  },
  "permissions": [
    "fs.read:${dataDir}",
    "ctx.provide"
  ]
}
```

**`index.js`** - entry point (required):
```js
'use strict';

module.exports = {
    install(ctx) {
        const log    = ctx.use('log');
        const events = ctx.use('events');
        const config = ctx.use('config');

        // Use permission-gated APIs
        const data = ctx.readFile('/path/to/file');
        ctx.writeFile('/path/to/output', 'content');

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
  "name": "/plugin-<name>",
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
git submodule add https://github.com/burgil-industries/<name>-plugin.git <name>
git commit -m "add <name> as submodule"
git push
```

---

### 6. Update the main repo to point to the new plugins commit

```bash
cd ..   # back to computer root
git add plugins
git commit -m "update plugins submodule - add <name>"
git push
```

---

## Plugin context API

Every plugin receives a `ctx` object in its `install(ctx)` function:

### Always allowed (no permission needed)

| Method / Property | Description |
|---|---|
| `ctx.use('key')` | Consume a service provided by another plugin |
| `ctx.onMessage(type, handler)` | Register a WebSocket message handler: `handler(socket, msg)` |
| `ctx.reply(socket, obj)` | Send a JSON response to one client |
| `ctx.loadedPlugins()` | Returns `{ id: { name, version } }` map of all loaded plugins |
| `ctx.appName` | The installed app name |
| `ctx.appVersion` | The installed app version |
| `ctx.dataDir` | Absolute path to the `data/` directory |

### Permission-gated methods

| Method | Required Permission | Description |
|---|---|---|
| `ctx.provide('key', value)` | `ctx.provide` | Expose a service for other plugins to consume |
| `ctx.broadcast(obj)` | `ctx.broadcast` | Send a JSON message to all connected clients |
| `ctx.readFile(path)` | `fs.read` or `fs.read:<path>` | Read a file as UTF-8 string |
| `ctx.readFileBuffer(path)` | `fs.read` or `fs.read:<path>` | Read a file as Buffer |
| `ctx.writeFile(path, data)` | `fs.write` or `fs.write:<path>` | Write data to a file |
| `ctx.existsSync(path)` | `fs.read` or `fs.read:<path>` | Check if a file exists |
| `ctx.readDir(path)` | `fs.read` or `fs.read:<path>` | List directory contents |
| `ctx.listen(port, handler)` | `net.listen` or `net.listen:<port>` | Start an HTTP server on a port |
| `ctx.fetch(url, options)` | `net.connect` or `net.connect:<host>` | Make an outbound HTTP request |
| `ctx.exec(command, args)` | `system.exec` or `system.exec:<cmd>` | Execute a command synchronously |
| `ctx.execAsync(command, args)` | `system.exec` or `system.exec:<cmd>` | Execute a command asynchronously |

Calling a gated method without the required permission throws a `PermissionError`.

Dependencies listed in `plugin.json` are loaded first. Load order: `core` -> `ui` -> everything else alphabetically.

---

## Permissions

Declare required permissions in `plugin.json` under the `permissions` array. The `${dataDir}` token expands to the app's data directory at load time.

### Permission format

```
category.action           # Wildcard - grants all scopes
category.action:scope     # Scoped - grants only matching scope
```

### Available permissions

| Permission | Description |
|---|---|
| `fs.read` | Read any file |
| `fs.read:<path>` | Read files under a specific path |
| `fs.write` | Write any file |
| `fs.write:<path>` | Write files under a specific path |
| `net.listen` | Listen on any network port |
| `net.listen:<port>` | Listen on a specific port |
| `net.connect` | Make outbound connections to any host |
| `net.connect:<host>` | Connect to a specific host |
| `system.exec` | Execute any child process |
| `system.exec:<cmd>` | Execute a specific command |
| `ctx.provide` | Register services for other plugins |
| `ctx.broadcast` | Broadcast messages to all WS clients |

### Wildcard matching

A permission without a scope grants all scopes. For example, `fs.read` grants access to `fs.read:/any/path`. Path-scoped permissions also match subdirectories: `fs.write:/data` grants `fs.write:/data/config.json`.

---

## Plugin packages

Packages are curated bundles of related plugins. They are defined in `public/packages/index.json` and displayed in the marketplace UI.

A package lists plugin IDs and metadata:

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

When a user installs a package, the combined permissions of all plugins are shown for approval before installation proceeds.

Individual plugin metadata is hosted in `public/plugins/index.json`.

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

## Plugin categories

The `[category]/` folder is a template placeholder - it shows the intended folder structure for organizing plugins by type. It is not a plugin and should not have a `git init`.
