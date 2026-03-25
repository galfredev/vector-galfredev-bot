param(
  [string]$SessionsDir = "$env:USERPROFILE\.openclaw\agents\main\sessions",
  [string]$OutputDir = "$env:USERPROFILE\.openclaw\workspace\leads"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-LeadRecord {
  param(
    [string]$Text,
    [string]$SourceFile,
    [string]$Timestamp
  )

  if ($Text -notmatch "^Nuevo lead desde el bot de GalfreDev") {
    return $null
  }

  $name = if ($Text -match "Nombre:\s*(.+)") { $matches[1].Trim() } else { "No especificado" }
  $business = if ($Text -match "Negocio:\s*(.+)") { $matches[1].Trim() } else { "No especificado" }
  $need = if ($Text -match "Necesidad:\s*(.+)") { $matches[1].Trim() } else { "No especificado" }
  $current = if ($Text -match "Como lo hacen hoy:\s*(.+)") { $matches[1].Trim() } else { "No especificado" }
  $state = if ($Text -match "Estado:\s*(.+)") { $matches[1].Trim() } else { "No especificado" }

  [PSCustomObject]@{
    timestamp = $Timestamp
    name = Normalize-Text $name
    business = Normalize-Text $business
    need = Normalize-Text $need
    current_process = Normalize-Text $current
    state = Normalize-Text $state
    source_file = [System.IO.Path]::GetFileName($SourceFile)
  }
}

function Normalize-Text {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $Value
  }

  $looksBroken =
    $Value.Contains([string][char]0x00C3) -or
    $Value.Contains([string][char]0x00E2) -or
    $Value.Contains([string][char]0x00F0)

  if ($looksBroken) {
    try {
      return [System.Text.Encoding]::UTF8.GetString(
        [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetBytes($Value)
      )
    } catch {
      return $Value
    }
  }

  return $Value
}

if (-not (Test-Path $SessionsDir)) {
  throw "Sessions dir not found: $SessionsDir"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$records = New-Object System.Collections.Generic.List[object]

Get-ChildItem -Path $SessionsDir -Filter *.jsonl -File | ForEach-Object {
  $sourceFile = $_.FullName

  Get-Content $sourceFile -Encoding UTF8 | ForEach-Object {
    if ([string]::IsNullOrWhiteSpace($_)) {
      return
    }

    try {
      $entry = $_ | ConvertFrom-Json -ErrorAction Stop
    } catch {
      return
    }

    if ($entry.type -ne "message") {
      return
    }

    if (-not $entry.message) {
      return
    }

    if ($entry.message.role -ne "assistant") {
      return
    }

    if (-not $entry.message.content) {
      return
    }

    foreach ($content in $entry.message.content) {
      $hasText = $false
      if ($content -and $content.PSObject -and $content.PSObject.Properties["text"]) {
        $hasText = $true
      }

      if (-not $hasText) {
        continue
      }

      $record = Get-LeadRecord -Text ([string]$content.text) -SourceFile $sourceFile -Timestamp $entry.timestamp
      if ($null -ne $record) {
        $records.Add($record)
      }
    }
  }
}

$unique = $records |
  Sort-Object timestamp |
  Group-Object name, business, need, current_process, state |
  ForEach-Object { $_.Group | Select-Object -First 1 }

$jsonlPath = Join-Path $OutputDir "lead-registry.jsonl"
$csvPath = Join-Path $OutputDir "lead-registry.csv"

if (Test-Path $jsonlPath) {
  Remove-Item $jsonlPath -Force
}

$unique | ForEach-Object {
  ($_ | ConvertTo-Json -Compress) | Add-Content -Path $jsonlPath
}

$unique | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8

Write-Output "Lead registry updated:"
Write-Output "  JSONL: $jsonlPath"
Write-Output "  CSV:   $csvPath"
Write-Output "  Count: $($unique.Count)"
