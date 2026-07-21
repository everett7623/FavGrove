[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SourceDirectory,

  [Parameter(Mandatory = $true)]
  [string]$ArchivePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$source = [System.IO.Path]::GetFullPath($SourceDirectory)
$archivePath = [System.IO.Path]::GetFullPath($ArchivePath)
if (-not [System.IO.Directory]::Exists($source)) {
  throw "Archive source directory does not exist: $source"
}
if (-not [System.IO.File]::Exists($archivePath)) {
  throw "Release archive does not exist: $archivePath"
}

$sourcePrefix = $source.TrimEnd(
  [System.IO.Path]::DirectorySeparatorChar,
  [System.IO.Path]::AltDirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar
$files = @(
  [System.IO.Directory]::EnumerateFiles(
    $source,
    '*',
    [System.IO.SearchOption]::AllDirectories
  ) | Sort-Object { $_.Substring($sourcePrefix.Length).Replace('\', '/') }
)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  $entries = @($archive.Entries)
  if ($entries.Count -ne $files.Count) {
    throw "Release archive entry count does not match dist/: expected $($files.Count), received $($entries.Count)."
  }

  for ($index = 0; $index -lt $files.Count; $index += 1) {
    $file = $files[$index]
    if (-not $file.StartsWith($sourcePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Archive source entry escaped the source directory: $file"
    }

    $expectedName = $file.Substring($sourcePrefix.Length).Replace('\', '/')
    $entry = $entries[$index]
    if ($entry.FullName -cne $expectedName) {
      throw "Release archive entry mismatch at index $index`: expected $expectedName, received $($entry.FullName)."
    }

    $timestamp = $entry.LastWriteTime
    if (
      $timestamp.Year -ne 1980 -or
      $timestamp.Month -ne 1 -or
      $timestamp.Day -ne 1 -or
      $timestamp.Hour -ne 0 -or
      $timestamp.Minute -ne 0 -or
      $timestamp.Second -ne 0
    ) {
      throw "Release archive entry has a non-deterministic timestamp: $expectedName"
    }

    $fileInfo = [System.IO.FileInfo]::new($file)
    if ($entry.Length -ne $fileInfo.Length) {
      throw "Release archive entry length does not match dist/: $expectedName"
    }

    $sourceStream = [System.IO.File]::OpenRead($file)
    $entryStream = $entry.Open()
    $sourceHashAlgorithm = [System.Security.Cryptography.SHA256]::Create()
    $entryHashAlgorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
      $sourceHash = [System.Convert]::ToBase64String($sourceHashAlgorithm.ComputeHash($sourceStream))
      $entryHash = [System.Convert]::ToBase64String($entryHashAlgorithm.ComputeHash($entryStream))
    } finally {
      $entryHashAlgorithm.Dispose()
      $sourceHashAlgorithm.Dispose()
      $entryStream.Dispose()
      $sourceStream.Dispose()
    }

    if ($sourceHash -cne $entryHash) {
      throw "Release archive entry content does not match dist/: $expectedName"
    }
  }
} finally {
  $archive.Dispose()
}
