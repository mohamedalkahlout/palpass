$proj = Split-Path -Parent $PSScriptRoot
$log = Join-Path $proj ".next\dev-server.log"
New-Item -ItemType Directory -Force -Path (Join-Path $proj ".next") | Out-Null
Set-Content -LiteralPath $log -Value ""
$cmd = "cmd.exe /c `"pnpm dev --port 3000 > `"$log`" 2>&1`""
$started = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd; CurrentDirectory = $proj }
"START_RETURN=$($started.ReturnValue)"
"START_PID=$($started.ProcessId)"
Set-Content -LiteralPath (Join-Path $proj ".next\dev-server.pid") -Value $started.ProcessId