# Ejecuta un archivo .sql contra Supabase (token en .mcp.json).
# IMPORTANTE: lee y envía en UTF-8. Leer con la codificación por defecto de
# PowerShell 5.1 corrompe las tildes de los datos (María -> Mar?a).
param([Parameter(Mandatory=$true)][string]$SqlPath)
$cfg = Get-Content ".mcp.json" -Raw | ConvertFrom-Json
$tok = $cfg.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN
$sql = [System.IO.File]::ReadAllText((Resolve-Path $SqlPath), [System.Text.Encoding]::UTF8)
$payload = New-Object psobject -Property @{ query = $sql }
$json = $payload | ConvertTo-Json -Depth 3
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$uri = "https://api.supabase.com/v1/projects/qoivnsnugfblfebrpifq/database/query"
$res = Invoke-RestMethod -Method Post -Uri $uri -Headers @{ Authorization = "Bearer $tok" } -ContentType "application/json; charset=utf-8" -Body $bytes
if ($res) { $res | ConvertTo-Json -Depth 5 -Compress } else { "OK" }
