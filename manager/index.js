'use strict';
const http = require('http');
const path = require('path');

const PORT = 53422;

module.exports = {
    install(ctx) {
        const log    = ctx.use('log');
        const vmCtrl = ctx.use('vm');

        // ── REST API + panel server ────────────────────────────────────────────
        const server = ctx.listen(PORT, (req, res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

            const url = req.url || '/';

            // ── Panel HTML (served directly from this plugin's directory) ──────
            if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
                const html = require('fs').readFileSync(path.join(__dirname, 'panel.html'));
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(html);
                return;
            }

            // ── GET /api/plugins ───────────────────────────────────────────────
            if (req.method === 'GET' && url === '/api/plugins') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(vmCtrl.getAll()));
                return;
            }

            // ── POST /api/plugins/:id/disable ──────────────────────────────────
            if (req.method === 'POST' && /^\/api\/plugins\/[^/]+\/disable$/.test(url)) {
                const id = url.split('/')[3];
                const dependents = vmCtrl.getDependents(id);
                if (dependents.length > 0) {
                    // Return dependents list so the UI can confirm
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ conflict: true, dependents }));
                    return;
                }
                const result = vmCtrl.disable(id);
                log(`manager: disabled "${id}" (restart_required=${result.restart_required})`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
                return;
            }

            // ── POST /api/plugins/:id/disable-force ────────────────────────────
            // Disables the plugin AND all dependents in one shot.
            if (req.method === 'POST' && /^\/api\/plugins\/[^/]+\/disable-force$/.test(url)) {
                const id = url.split('/')[3];
                const dependents = vmCtrl.getDependents(id);
                for (const dep of dependents) vmCtrl.disable(dep);
                const result = vmCtrl.disable(id);
                log(`manager: force-disabled "${id}" + dependents [${dependents.join(', ')}]`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ...result, also_disabled: dependents }));
                return;
            }

            // ── POST /api/plugins/:id/enable ───────────────────────────────────
            if (req.method === 'POST' && /^\/api\/plugins\/[^/]+\/enable$/.test(url)) {
                const id = url.split('/')[3];
                vmCtrl.enable(id).then(result => {
                    log(`manager: enabled "${id}" (loaded=${result.loaded})`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                }).catch(err => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: err.message }));
                });
                return;
            }

            // ── POST /api/plugins/:id/reset-perms ─────────────────────────────
            if (req.method === 'POST' && /^\/api\/plugins\/[^/]+\/reset-perms$/.test(url)) {
                const id = url.split('/')[3];
                vmCtrl.resetPerms(id).then(result => {
                    log(`manager: reset permissions for "${id}"`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                }).catch(err => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: err.message }));
                });
                return;
            }

            res.writeHead(404); res.end('Not found');
        });

        server.on('error', err => log(`manager: server error — ${err.message}`, 'ERROR'));

        // Register as a redirect panel in the UI plugin
        const registerPanel = ctx.use('ui.registerPanel');
        registerPanel('manager', `http://127.0.0.1:${PORT}/`, 'Plugin Manager');

        log(`manager: panel server -> http://127.0.0.1:${PORT}`);
        log('manager plugin loaded');
    },
};
