<#
.SYNOPSIS
Refresh one ported skill from github.com/mattpocock/skills.

.DESCRIPTION
Rebuilds the local skill as upstream plus the local "## Pentix project notes"
section. Without -Apply the script only reports. With -Apply it writes the files
and mirrors the directory into the Codex, OpenCode, and GitHub skill directories.

When the local file carries edits outside the notes section, -Apply refuses
unless you pass -Force, because those edits would be lost.

.PARAMETER Name
Skill folder name, for example code-review.

.PARAMETER Apply
Write the rebuilt files and mirror them.

.PARAMETER Force
Allow -Apply to drop local edits that sit outside the notes section.

.EXAMPLE
powershell -NoProfile -File scripts\update-agent-skill.ps1 -Name tdd -Apply
#>
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [switch]$Apply,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $repoRoot ".cline\skills\$Name"
if (-not (Test-Path $localRoot)) { throw "Unknown local skill: $localRoot" }

function Normalize([string]$text) { $text -replace "`r`n", "`n" }
$utf8 = New-Object System.Text.UTF8Encoding($false)
function WriteUtf8([string]$path, [string]$text) { [System.IO.File]::WriteAllText($path, $text, $utf8) }

$notesHeading = '## Pentix project notes'
$localText = Normalize (Get-Content (Join-Path $localRoot 'SKILL.md') -Raw -Encoding UTF8)
$notesIndex = $localText.IndexOf($notesHeading)
if ($notesIndex -lt 0) { throw "Add a '$notesHeading' section to SKILL.md before you update." }
$localBody = $localText.Substring(0, $notesIndex).TrimEnd()
$notes = $localText.Substring($notesIndex).TrimEnd()

$tree = Invoke-RestMethod -Uri 'https://api.github.com/repos/mattpocock/skills/git/trees/main?recursive=1' -Headers @{ 'User-Agent' = 'pentix-agent-skills' }
$pattern = "^skills/(engineering|productivity)/$([regex]::Escape($Name))/"
$blobs = $tree.tree | Where-Object { $_.type -eq 'blob' -and $_.path -match $pattern }
if (-not $blobs) { throw "Skill not found upstream: $Name" }
$slug = ($blobs[0].path -split '/')[0..2] -join '/'

$temp = Join-Path $env:TEMP "pentix-skill-$Name"
if (Test-Path $temp) { Remove-Item -LiteralPath $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp -Force | Out-Null

$plan = @()
foreach ($blob in $blobs) {
  $relative = $blob.path.Substring($slug.Length + 1)
  $download = Join-Path $temp $relative
  $parent = Split-Path $download -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  Invoke-WebRequest -Uri "https://raw.githubusercontent.com/mattpocock/skills/main/$($blob.path)" -OutFile $download -UseBasicParsing
  $plan += [pscustomobject]@{ Relative = $relative; Path = $download; Content = (Normalize (Get-Content $download -Raw -Encoding UTF8)) }
}

$skillFile = $plan | Where-Object { $_.Relative -eq 'SKILL.md' }
$upstreamBody = $skillFile.Content.TrimEnd()
$diverged = $localBody -ne $upstreamBody

Write-Host "Skill: $Name"
Write-Host "Upstream: $slug"
if ($diverged) {
  Write-Host "  local body edits exist outside the notes section"
  WriteUtf8 (Join-Path $temp 'upstream-body.md') ($upstreamBody + "`n")
  WriteUtf8 (Join-Path $temp 'local-body.md') ($localBody + "`n")
  $ErrorActionPreference = 'Continue'
  git --no-pager diff --no-index --unified=2 -- (Join-Path $temp 'upstream-body.md') (Join-Path $temp 'local-body.md') 2>$null | Select-Object -Skip 4 | Select-Object -First 80
  $ErrorActionPreference = 'Stop'
} else {
  Write-Host "  local body matches upstream"
}

foreach ($item in $plan) {
  $localPath = Join-Path $localRoot $item.Relative
  if (-not (Test-Path $localPath)) { Write-Host "  new      $($item.Relative)"; continue }
  $expected = if ($item.Relative -eq 'SKILL.md') { $upstreamBody + "`n`n" + $notes + "`n" } else { $item.Content }
  if ((Normalize (Get-Content $localPath -Raw -Encoding UTF8)) -eq $expected) { Write-Host "  same     $($item.Relative)"; continue }
  Write-Host "  changed  $($item.Relative)"
}
foreach ($file in Get-ChildItem $localRoot -Recurse -File) {
  $relative = $file.FullName.Substring($localRoot.Length + 1)
  if ($relative -like 'agents*') { continue }
  if (-not ($plan | Where-Object { $_.Relative -eq $relative })) { Write-Host "  local-only $relative" }
}

if (-not $Apply) {
  Write-Host "Dry run. Re-run with -Apply to write."
  exit 0
}
if ($diverged -and -not $Force) {
  throw "Refused: local body edits outside the notes section. Merge them into the notes, or pass -Force to drop them."
}

Write-Host ""
Write-Host "This rewrites .cline/skills/$Name and mirrors it to .codex, .opencode, and .github."
$answer = Read-Host "Type the skill name to continue"
if ($answer -ne $Name) { throw "Aborted: the answer did not match '$Name'." }

foreach ($item in $plan) {
  if ($item.Relative -like 'agents*') { continue }
  $localPath = Join-Path $localRoot $item.Relative
  $parent = Split-Path $localPath -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  $content = if ($item.Relative -eq 'SKILL.md') { $upstreamBody + "`n`n" + $notes + "`n" } else { $item.Content }
  WriteUtf8 $localPath $content
}

foreach ($target in @('.codex\skills', '.opencode\skills', '.github\skills')) {
  $destination = Join-Path $repoRoot (Join-Path $target $Name)
  if (Test-Path $destination) { Remove-Item -LiteralPath $destination -Recurse -Force }
  Copy-Item -LiteralPath $localRoot -Destination $destination -Recurse -Force
  if ($target -eq '.codex\skills') {
    foreach ($agent in ($plan | Where-Object { $_.Relative -like 'agents*' })) {
      $agentTarget = Join-Path $destination $agent.Relative
      $agentParent = Split-Path $agentTarget -Parent
      if (-not (Test-Path $agentParent)) { New-Item -ItemType Directory -Path $agentParent -Force | Out-Null }
      Copy-Item -LiteralPath $agent.Path -Destination $agentTarget -Force
    }
  }
}

python (Join-Path $repoRoot '.cline\skills\asd-ste100\scripts\ste-lint.py') (Join-Path $localRoot 'SKILL.md')
Write-Host "Mirrored to .codex, .opencode, and .github. Refresh the baseline in docs/agent-skills.md when the hard count moves."


