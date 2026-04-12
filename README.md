# COMPUTER Plugins

Each folder is an independent plugin (git submodule). Plugins run in a Node.js `vm` sandbox and declare every permission upfront.

**Full developer guide ->** open COMPUTER and click **Plugin Docs** in the header.

---

## Quick start

```js
// plugins/hello/index.js
'use strict';
module.exports = {
  install(ctx) {
    const log = ctx.use('log');
    log('Hello, World!');
  }
};
```

```json
// plugins/hello/plugin.json
{
  "id": "hello",
  "name": "Hello",
  "version": "1.0.0",
  "dependencies": { "core": "*" },
  "permissions": ["fs.read:${dataDir}", "fs.write:${dataDir}"]
}
```

Drop the folder in `plugins/`, restart - a permission dialog appears once, then the plugin is active.

---

## Built-in plugins

| Plugin | Port | Description |
|---|---|---|
| `core` | - | Event bus, config, logger |
| `ui` | 53421 | HTTP panel server |
| `settings` | - | Settings panel at `/settings` |
| `manager` | 53422 | Plugin manager UI at `/manager` |
| `tray` | - | Windows system tray icon |
| `example` | - | Minimal demo |

---

## Adding a plugin as a submodule

```bash
git submodule add https://github.com/your-org/my-plugin.git plugins/my-plugin

# Clone with all submodules
git clone --recurse-submodules https://github.com/your-org/computer.git
```

---

## Plugin categories

The `[category]/` folder is a template placeholder for organizing plugins by type. Not a plugin - no `git init`.
