# Human-in-the-loop reproduction loop for PowerShell.
# Copy this file, edit the steps below, and run it.
# The agent runs the script; the user follows prompts in their terminal.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\hitl-loop.template.ps1
#
# Two helpers:
#   Step "<instruction>"          -> show instruction, wait for Enter
#   Capture ERRORED "<question>"  -> show question, read response into the variable
#
# At the end, captured values are printed as KEY=VALUE for the agent to parse.
#
# Capture prints its value back to the terminal, where the agent reads it.
# Capture observations only. A sign-in stays a Step.

$ErrorActionPreference = 'Stop'

function Step {
  param([Parameter(Mandatory)][string]$Instruction)
  Write-Host ""
  Write-Host ">>> $Instruction"
  Read-Host "    [Enter when done]" | Out-Null
}

function Capture {
  param([Parameter(Mandatory)][string]$Variable, [Parameter(Mandatory)][string]$Question)
  Write-Host ""
  Write-Host ">>> $Question"
  $answer = Read-Host "    >"
  Set-Variable -Name $Variable -Value $answer -Scope 1
}

# --- edit below ---------------------------------------------------------

Step "Open the app at http://127.0.0.1:5173 and sign in."

Capture "ERRORED" "Click the 'Export' button. Did it throw an error? (y/n)"

Capture "ERROR_MSG" "Paste the error message (or 'none'):"

# --- edit above ---------------------------------------------------------

Write-Host ""
Write-Host "--- Captured ---"
Write-Host "ERRORED=$ERRORED"
Write-Host "ERROR_MSG=$ERROR_MSG"
