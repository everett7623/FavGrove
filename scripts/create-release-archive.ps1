[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDirectory,

  [Parameter(Mandatory = $true)]
  [string]$DestinationPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$source = [System.IO.Path]::GetFullPath($SourceDirectory)
$destination = [System.IO.Path]::GetFullPath($DestinationPath)
if (-not [System.IO.Directory]::Exists($source)) {
  throw "Archive source directory does not exist: $source"
}

$sourcePrefix = $source.TrimEnd(
  [System.IO.Path]::DirectorySeparatorChar,
  [System.IO.Path]::AltDirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar
if ($destination.StartsWith($sourcePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Archive destination must be outside the source directory.'
}

$destinationDirectory = [System.IO.Path]::GetDirectoryName($destination)
if (-not [System.IO.Directory]::Exists($destinationDirectory)) {
  [System.IO.Directory]::CreateDirectory($destinationDirectory) | Out-Null
}
if ([System.IO.File]::Exists($destination)) {
  [System.IO.File]::Delete($destination)
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = $null
$completed = $false
try {
  $archive = [System.IO.Compression.ZipFile]::Open(
    $destination,
    [System.IO.Compression.ZipArchiveMode]::Create
  )
  $fixedTimestamp = [System.DateTimeOffset]::new(1980, 1, 1, 0, 0, 0, [System.TimeSpan]::Zero)
  $files = [System.IO.Directory]::EnumerateFiles(
    $source,
    '*',
    [System.IO.SearchOption]::AllDirectories
  ) | Sort-Object { $_.Substring($sourcePrefix.Length).Replace('\', '/') }

  foreach ($file in $files) {
    if (-not $file.StartsWith($sourcePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Archive entry escaped the source directory: $file"
    }

    $entryName = $file.Substring($sourcePrefix.Length).Replace('\', '/')
    $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entry.LastWriteTime = $fixedTimestamp
    $inputStream = [System.IO.File]::OpenRead($file)
    $outputStream = $entry.Open()
    try {
      $inputStream.CopyTo($outputStream)
    } finally {
      $outputStream.Dispose()
      $inputStream.Dispose()
    }
  }

  $completed = $true
} finally {
  if ($null -ne $archive) {
    $archive.Dispose()
  }
  if (-not $completed -and [System.IO.File]::Exists($destination)) {
    [System.IO.File]::Delete($destination)
  }
}
