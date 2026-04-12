# Guide 04 — Building a Panel UI

The `ui` plugin hosts an HTTP server (default port 53421) and lets other plugins register web panels.

## Registering a panel

```js
// dependencies: { "core": "*", "ui": "*" }
// permissions: ["net.listen:<port>", "fs.read", "ctx.provide"]

install(ctx) {
    const registerPanel = ctx.use('ui.registerPanel');
    const openPanel     = ctx.use('ui.openPanel');

    // Option A — serve a local HTML file (and assets from the same directory)
    registerPanel('my-panel', path.join(__dirname, 'panel.html'), 'My Panel');

    // Option B — redirect to your own HTTP server
    registerPanel('my-panel', 'http://127.0.0.1:53430/', 'My Panel');
}
```

After registration the panel is accessible at:
```
http://127.0.0.1:53421/my-panel
```

Assets in the same directory as the HTML file are served at:
```
http://127.0.0.1:53421/my-panel/style.css
http://127.0.0.1:53421/my-panel/app.js
```

## Opening a panel programmatically

```js
const openPanel = ctx.use('ui.openPanel');
openPanel('my-panel');   // opens the default browser
openPanel();             // opens the panel index
```

## REST API pattern (Option B)

If your panel needs dynamic data, start your own HTTP server and register it as a URL:

```js
install(ctx) {
    const server = ctx.listen(53430, (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (req.url === '/') {
            // serve panel HTML
        } else if (req.url === '/api/data') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        }
    });

    const registerPanel = ctx.use('ui.registerPanel');
    registerPanel('my-panel', 'http://127.0.0.1:53430/', 'My Panel');
}
```

The panel HTML (served from port 53430) can then `fetch('/api/data')` or `fetch('http://127.0.0.1:53430/api/data')` directly.

## Panel HTML template

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>My Panel</title>
<style>
  body { font-family: system-ui; background: #0a0a0f; color: #e2e8f0;
         padding: 32px 24px; margin: 0; }
</style>
</head>
<body>
  <h1>My Panel</h1>
  <div id="content">Loading…</div>
  <script>
    fetch('/api/data')
      .then(r => r.json())
      .then(data => {
        document.getElementById('content').textContent = JSON.stringify(data);
      });
  </script>
</body>
</html>
```
