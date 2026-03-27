param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$MediaPath
)

$ErrorActionPreference = "Stop"

$homeDir = $env:USERPROFILE
if (-not $homeDir) {
  throw "USERPROFILE not set"
}

$whisperRoot = Join-Path $homeDir ".local\share\whisper.cpp\release\Release"
$whisperExe = Join-Path $whisperRoot "whisper-cli.exe"
$modelName = if ($env:OPENCLAW_WHISPER_MODEL) { $env:OPENCLAW_WHISPER_MODEL } else { "base" }
$language = if ($env:OPENCLAW_WHISPER_LANG) { $env:OPENCLAW_WHISPER_LANG } else { "auto" }
$modelPath = Join-Path $homeDir ".cache\whisper\ggml-$modelName.bin"
$ffmpegExe = python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"

if (-not (Test-Path -LiteralPath $MediaPath)) {
  throw "Audio file not found: $MediaPath"
}

if (-not (Test-Path -LiteralPath $whisperExe)) {
  throw "whisper-cli.exe not found: $whisperExe"
}

if (-not (Test-Path -LiteralPath $modelPath)) {
  throw "Whisper model not found: $modelPath"
}

$tempWav = Join-Path $env:TEMP ("openclaw-whisper-" + [guid]::NewGuid().ToString() + ".wav")
$originalPath = $env:PATH
$env:PATH = "$whisperRoot;$originalPath"

try {
  & $ffmpegExe -hide_banner -loglevel error -y -i $MediaPath -ar 16000 -ac 1 -c:a pcm_s16le $tempWav
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $whisperExe
  $psi.Arguments = ('-m "{0}" -l {1} -f "{2}" -nt' -f $modelPath, $language, $tempWav)
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.Environment["PATH"] = $env:PATH

  $process = [System.Diagnostics.Process]::Start($psi)
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    throw "whisper-cli failed. $stderr"
  }

  $stdout.Trim()
} finally {
  $env:PATH = $originalPath
  if (Test-Path -LiteralPath $tempWav) {
    Remove-Item -LiteralPath $tempWav -Force
  }
}
