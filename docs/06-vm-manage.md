# Guide 06 — VM Control API

The `vm.manage` permission gives a plugin access to the built-in VM control service, which lets it inspect and manage all loaded plugins at runtime.

## Declaring the permission

```json
{
  "permissions": ["vm.manage", "ctx.provide", "net.listen:PORT"]
}
```

## Using the service

```js
install(ctx) {
    const vm = ctx.use('vm');
}
```

## API reference

### `vm.getAll()` → `PluginDescriptor[]`

Returns every plugin/bundle found in the plugins directory, annotated with live status.

```js
const plugins = vm.getAll();
// [
//   {
//     id: 'core', name: 'Core', version: '1.0.0',
//     type: 'plugin',              // or 'bundle'
//     status: 'loaded',            // loaded | denied | error | disabled | new | removed
//     loaded: true,                // currently active in this session
//     dependencies: [],
//     dependents: ['ui', 'settings', 'manager'],
//     permissions: ['fs.read:...', 'ctx.provide'],
//     description: '...',
//   },
//   ...
// ]
```

### `vm.getDependents(id)` → `string[]`

Returns the **transitive** list of plugin IDs that depend on `id` (i.e. would break if `id` were disabled).

```js
vm.getDependents('core')
// ['ui', 'settings', 'manager', 'tray', 'example', ...]
```

### `vm.disable(id)` → `{ ok, restart_required }`

Marks the plugin as disabled in the cache. If the plugin is currently loaded, it keeps running until restart.

```js
const result = vm.disable('example');
// { ok: true, restart_required: false }
```

### `vm.enable(id)` → `Promise<{ ok, loaded }>`

Clears the disabled/denied/error status and immediately tries to load the plugin.

```js
const result = await vm.enable('example');
// { ok: true, loaded: true }   — if load succeeded
// { ok: true, loaded: false }  — if still pending (e.g. dependencies missing)
```

### `vm.resetPerms(id)` → `Promise<{ ok }>`

Deletes the saved permission file for the plugin, then triggers a re-load. The permission dialog will appear again.

```js
await vm.resetPerms('example');
// { ok: true }
```

### `vm.getLoaded()` → `string[]`

Returns the IDs of all plugins currently active in this session.

```js
vm.getLoaded()
// ['core', 'ui', 'settings', 'manager']
```

## Dependency-safe disable

Before disabling a plugin, check its dependents:

```js
const deps = vm.getDependents('core');
if (deps.length > 0) {
    console.warn(`Disabling core will also affect: ${deps.join(', ')}`);
    // Disable dependents first, then core
    for (const dep of deps) vm.disable(dep);
}
vm.disable('core');
```

The Plugin Manager UI (`http://127.0.0.1:53421/manager`) handles this automatically with a confirmation dialog.
