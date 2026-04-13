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
// plugins/hello/plugin.computer
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

## Hooks

The core plugin provides a WordPress-style hooks system. Plugins can register actions (side effects) and filters (value transforms) for any hook name.

### Registering hooks

```js
module.exports = {
  install(ctx) {
    const hooks = ctx.use('hooks');

    // Actions - fire-and-forget side effects
    hooks.addAction('app:launch', async (data) => {
      console.log('App launched!');
    });

    hooks.addAction('app:file-open', async ({ path }) => {
      console.log('File opened:', path);
    });

    // Filters - transform a value through a chain
    hooks.addFilter('my-plugin:transform', async (value, data) => {
      return value.toUpperCase();
    });

    // Priority (lower = earlier, default 10)
    hooks.addAction('app:launch', myCallback, 5);  // runs before default
  }
};
```

### Built-in hooks

| Hook | Fired when | Data |
|---|---|---|
| `app:launch` | After all plugins load | `{}` |
| `app:shutdown` | Before the app exits | `{}` |
| `app:file-open` | A `.computer` file is opened | `{ path }` |
| `app:protocol` | A `computer://` URI is received | `{ uri, host, path, query }` |
| `app:before-install` | Before a plugin install via protocol | `{ pluginId, version }` |

### Custom hooks

Plugins can define and fire their own hooks:

```js
// In your plugin
const hooks = ctx.use('hooks');
await hooks.doAction('my-plugin:custom-event', { key: 'value' });
const result = await hooks.applyFilters('my-plugin:filter', initialValue);
```

---

## Manifest files

- **`plugin.computer`** - Plugin manifest (id, name, version, permissions, dependencies)
- **`bundle.computer`** - Bundle manifest (groups multiple plugins for combined permission dialog)

---

## Built-in plugins

| Plugin | Port | Description |
|---|---|---|
| `core` | - | Event bus, hooks, config, logger |
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
