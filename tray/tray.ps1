<#
.SYNOPSIS
    COMPUTER system tray icon.
    Runs in STA mode so WinForms works. Launched as a detached background
    process by the tray plugin (plugins/tray/index.js).

.PARAMETER Port
    Port of the UI panel server (default 53421).

.PARAMETER AppName
    Display name shown in the tray tooltip and menu header.

.PARAMETER IconPath
    Full path to a .ico file. Falls back to a built-in system icon if not found.
#>
param(
    [int]    $Port     = 53421,
    [string] $AppName  = 'COMPUTER',
    [string] $IconPath = ''
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$url = "http://127.0.0.1:$Port"

# ── Tray icon image ────────────────────────────────────────────────────────────
if ($IconPath -and (Test-Path $IconPath)) {
    $icon = [System.Drawing.Icon]::new($IconPath)
} else {
    # Fall back to the generic application icon from the shell
    $icon = [System.Drawing.SystemIcons]::Application
}

# ── NotifyIcon ─────────────────────────────────────────────────────────────────
$tray          = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon     = $icon
$tray.Text     = $AppName
$tray.Visible  = $true

# ── Context menu ──────────────────────────────────────────────────────────────
$menu = New-Object System.Windows.Forms.ContextMenuStrip

# Header item (non-clickable label)
$header           = New-Object System.Windows.Forms.ToolStripMenuItem
$header.Text      = $AppName
$header.Font      = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
$header.Enabled   = $false
[void]$menu.Items.Add($header)
[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

# Open panels
$open           = New-Object System.Windows.Forms.ToolStripMenuItem
$open.Text      = 'Open Panels'
$open.Add_Click({ Start-Process $url })
[void]$menu.Items.Add($open)

# Open plugin manager directly
$mgr           = New-Object System.Windows.Forms.ToolStripMenuItem
$mgr.Text      = 'Plugin Manager'
$mgr.Add_Click({ Start-Process "$url/manager" })
[void]$menu.Items.Add($mgr)

[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

# Exit (removes icon and stops the PS process; Node.js keeps running)
$exit           = New-Object System.Windows.Forms.ToolStripMenuItem
$exit.Text      = 'Hide Tray Icon'
$exit.Add_Click({
    $tray.Visible = $false
    $tray.Dispose()
    [System.Windows.Forms.Application]::Exit()
})
[void]$menu.Items.Add($exit)

$tray.ContextMenuStrip = $menu

# Left-click opens the panels URL
$tray.Add_MouseClick({
    param($s, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        Start-Process $url
    }
})

# ── Message loop (keeps icon alive until Exit is chosen) ─────────────────────
[System.Windows.Forms.Application]::Run()

# Cleanup
$tray.Visible = $false
$tray.Dispose()
