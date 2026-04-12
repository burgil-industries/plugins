'use strict';
const path = require('path');

module.exports = {
    install(ctx) {
        const log  = ctx.use('log');
        const port = ctx.use('ui.port');   // guaranteed available — ui is a dependency

        // Path to the bundled PowerShell tray script
        const ps1 = path.join(ctx.pluginDir, 'tray.ps1');

        // App icon — falls back gracefully in the PS script if not present
        const iconPath = path.join(ctx.dataDir, '..', '..', 'assets',
            ctx.appName.toLowerCase() + '.ico');

        try {
            ctx.spawnDetached('powershell.exe', [
                '-STA',
                '-NonInteractive',
                '-WindowStyle', 'Hidden',
                '-ExecutionPolicy', 'Bypass',
                '-File', ps1,
                '-Port', String(port),
                '-AppName', ctx.appName,
                '-IconPath', iconPath,
            ]);
            log(`tray: icon started (UI -> http://127.0.0.1:${port})`);
        } catch (e) {
            log(`tray: failed to start icon — ${e.message}`, 'WARN');
        }

        log('tray plugin loaded');
    },
};
