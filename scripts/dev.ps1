# Two real terminal windows, one per server.
#
# `uv run reelforge-dev` runs both in one process, which is the right default and the
# wrong thing when you are debugging: the output interleaves, and restarting one restarts
# both. This opens the API in one PowerShell window and Vite in another, so each has its
# own scrollback and its own Ctrl+C.
#
#   powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
#
# ExecutionPolicy is the usual first-run stumble on Windows; the flag above avoids
# changing anything machine-wide.

param(
    # Close both windows when they exit instead of leaving the shell open. Off by
    # default: a server that dies immediately takes its error message with it.
    [switch]$CloseOnExit
)

$root = Split-Path -Parent $PSScriptRoot
$flag = if ($CloseOnExit) { "-Command" } else { "-NoExit", "-Command" }

Write-Host "ReelForge — starting two terminals from $root" -ForegroundColor Cyan

Start-Process powershell -ArgumentList (
    $flag + @("Set-Location '$root'; Write-Host 'API  -> http://127.0.0.1:8000' -ForegroundColor Green; uv run reelforge-api")
)

Start-Process powershell -ArgumentList (
    $flag + @("Set-Location '$root\frontend'; Write-Host 'UI   -> http://localhost:5173' -ForegroundColor Green; npm run dev")
)

Write-Host ""
Write-Host "  API  http://127.0.0.1:8000/api/v1/admin/health"
Write-Host "  UI   http://localhost:5173"
Write-Host ""
Write-Host "Close either window to stop that half. Nothing here writes to the repo —"
Write-Host "projects and renders go to REELFORGE_DATA_DIR (see .env)."
