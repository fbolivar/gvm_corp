# Ejecuta en orden todos los lotes .sql de una carpeta (UTF-8).
param([Parameter(Mandatory=$true)][string]$Dir)
$cfg = Get-Content ".mcp.json" -Raw | ConvertFrom-Json
$tok = $cfg.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN
$uri = "https://api.supabase.com/v1/projects/qoivnsnugfblfebrpifq/database/query"
$files = Get-ChildItem -LiteralPath $Dir -Filter *.sql | Sort-Object Name
foreach ($f in $files) {
    $sql = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $payload = New-Object psobject -Property @{ query = $sql }
    $json = $payload | ConvertTo-Json -Depth 3
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    try {
        Invoke-RestMethod -Method Post -Uri $uri -Headers @{ Authorization = "Bearer $tok" } -ContentType "application/json; charset=utf-8" -Body $bytes | Out-Null
        Write-Output ("OK  " + $f.Name)
    } catch {
        Write-Output ("ERR " + $f.Name + " :: " + $_.Exception.Message)
        if ($_.ErrorDetails) { Write-Output $_.ErrorDetails.Message }
        break
    }
}
