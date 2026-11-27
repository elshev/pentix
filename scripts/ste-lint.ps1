<#
.SYNOPSIS
Run the STE linter over the repository documents and one active change.

.DESCRIPTION
Collects documentation and spec files and passes them to the bundled linter in
one run. With no argument the script lints every shipped static file: README.md,
GLOSSARY.md, docs/*.md, and openspec/specs/*/spec.md. It does not lint a change
folder or the archive.

Use -Change to lint one change with its spec deltas, and -Path to add files.
Both options can be combined. A change lint with -Path README.md,GLOSSARY.md,
docs/foundation.md is the gate that an apply session needs.

The exit code is the linter's exit code. Exit code 1 means hard violations
remain.

.PARAMETER Change
Active change folder name, for example save-demo-game-sessions.

.PARAMETER All
Lint every shipped static file. This is the default when no other argument is
given. Active change folders are not included. Lint one with -Change.

.PARAMETER Path
Extra files to lint, relative to the repository root. Separate several files
with a comma.

.PARAMETER Baseline
Hard violations to tolerate. Defaults to 0, so one new hard violation fails.

.PARAMETER Disable
Linter rule IDs to silence, for example long-sentence.

.EXAMPLE
powershell -NoProfile -File scripts\ste-lint.ps1

.EXAMPLE
powershell -NoProfile -File scripts\ste-lint.ps1 -Change save-demo-game-sessions -Path README.md,GLOSSARY.md,docs/foundation.md
#>
param(
  [string]$Change,
  [switch]$All,
  [string[]]$Path,
  [int]$Baseline = 0,
  [string[]]$Disable
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$linterPath = '.cline/skills/asd-ste100/scripts/ste-lint.py'
$files = New-Object System.Collections.Generic.List[string]

function ConvertTo-RepoRelative([string]$fullPath) {
  return $fullPath.Substring($repoRoot.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/')
}

function Add-LintFile([string]$relativePath) {
  $fullPath = Join-Path $repoRoot $relativePath
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    throw "Lint file not found: $relativePath"
  }

  [void]$files.Add($relativePath.Replace('\', '/'))
}

function Add-LintTree([string]$relativeRoot, [string]$filter) {
  $root = Join-Path $repoRoot $relativeRoot
  if (-not (Test-Path -LiteralPath $root)) {
    return
  }

  Get-ChildItem -LiteralPath $root -Recurse -File -Filter $filter | ForEach-Object {
    [void]$files.Add((ConvertTo-RepoRelative $_.FullName))
  }
}

function Add-ChangeFiles([string]$name) {
  if ($name -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
    throw "Invalid change name: $name"
  }

  $changeRoot = "openspec/changes/$name"
  if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $changeRoot))) {
    throw "Unknown change: $name"
  }

  foreach ($artifact in @('proposal.md', 'design.md', 'tasks.md')) {
    $relativePath = "$changeRoot/$artifact"
    if (Test-Path -LiteralPath (Join-Path $repoRoot $relativePath)) {
      [void]$files.Add($relativePath)
    }
  }

  Add-LintTree "$changeRoot/specs" '*.md'
}

function Add-AllFiles {
  Add-LintFile 'README.md'
  Add-LintFile 'GLOSSARY.md'
  Add-LintTree 'docs' '*.md'
  Add-LintTree 'openspec/specs' 'spec.md'
}

$lintAll = $All -or (-not $Change -and -not $Path)
if ($lintAll) {
  Add-AllFiles
}

if ($Change) {
  Add-ChangeFiles $Change
}

$pathEntries = @(
  $Path |
    ForEach-Object { $_ -split ',' } |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
)

foreach ($entry in $pathEntries) {
  $fullPath = if ([System.IO.Path]::IsPathRooted($entry)) {
    $entry
  } else {
    Join-Path $repoRoot $entry
  }

  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
    throw "Lint file not found: $entry"
  }
  if (-not $fullPath.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Lint file must sit inside the repository: $entry"
  }

  [void]$files.Add((ConvertTo-RepoRelative $fullPath))
}

$lintFiles = @($files | Sort-Object -Unique)
if ($lintFiles.Count -eq 0) {
  throw 'No lint file was collected.'
}

if ($null -eq (Get-Command python -ErrorAction SilentlyContinue)) {
  throw 'python was not found on PATH.'
}

$linterArgs = @($linterPath) + $lintFiles + @('--baseline', "$Baseline")
if ($Disable) {
  $linterArgs += @('--disable', ($Disable -join ','))
}

$exitCode = 1
Push-Location $repoRoot
try {
  Write-Host "Linting $($lintFiles.Count) files with the STE linter."
  & python @linterArgs
  $exitCode = $LASTEXITCODE
} finally {
  Pop-Location
}

exit $exitCode
