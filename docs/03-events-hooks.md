# Guide 03 — Events & Hooks

The `core` plugin exposes a shared `EventEmitter` (the "event bus") that all plugins share. This is the primary mechanism for loose coupling — equivalent to WordPress actions and filters.

## Getting the event bus

```js
install(ctx) {
    const events = ctx.use('events');
}
```

## Emitting events (do_action)

```js
events.emit('my-plugin:something-happened', { detail: 42 });
```

Use namespaced event names (`plugin-id:event-name`) to avoid collisions.

## Listening to events (add_action)

```js
events.on('my-plugin:something-happened', ({ detail }) => {
    console.log('got:', detail);
});

// One-time handler
events.once('ui:ready', ({ port }) => {
    console.log('UI is up on port', port);
});
```

## Filter pattern (add_filter / apply_filters)

Node's EventEmitter doesn't have a built-in filter return value. Use the **service override** pattern instead:

```js
// Original log service from core:
//   ctx.provide('log', (msg, level) => console.log(...))

// Your plugin wraps it:
install(ctx) {
    const original = ctx.use('log');
    ctx.provide('log', (msg, level = 'INFO') => {
        if (msg.includes('password')) return;   // redact sensitive logs
        original(`[${ctx.pluginId}] ${msg}`, level);
    });
}
```

The last `ctx.provide` for a key wins, so load order matters (put interceptors after the plugin they wrap in `dependencies`).

## Well-known system events

| Event | When | Payload |
|---|---|---|
| `core:log` | Every log call | `{ level, msg, line }` |
| `ui:ready` | UI HTTP server is listening | `{ port }` |
| `ui:panel:registered` | A panel is registered | `{ id, title }` |
| `settings:changed` | A config key is written | `{ key, value }` |
| `vm:broadcast` | `ctx.broadcast()` called | raw object |

## Async event handlers

The EventEmitter is synchronous. For async work, fire-and-forget is the simplest approach:

```js
events.on('settings:changed', async ({ key, value }) => {
    if (key !== 'theme') return;
    await applyTheme(value);   // runs async, errors are not propagated back
});
```

If you need reliable async pipelines, wrap them with proper error handling.
