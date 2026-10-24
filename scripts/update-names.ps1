<#
.SYNOPSIS
    Regenerates the upgrade-name map and reports whether it changed.

.DESCRIPTION
    Runs npm run generate:names from the repo root, wherever the script is called from, then
    uses git to compare src/lib/names/upgradeNames.generated.ts with the committed version.

    The generated file's "// Generated: <date>" header line changes on every run, so it is
    ignored when comparing. If that date is the only difference, the file is restored to the
    committed version so the working tree stays clean.

    To pick up new game content, update the data package first:
        npm i -D clash-of-clans-data@latest

    Works in Windows PowerShell 5.1 and PowerShell 7. Set the NO_COLOR environment variable to
    turn off colours.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/update-names.ps1

    Regenerates the names and prints "Names are up to date" or the changed lines.

.OUTPUTS
    None. Exit code 0 if generation ran (whether or not names changed), 1 if it failed.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
# $ErrorActionPreference stays at its default ('Continue') on purpose: in Windows PowerShell 5.1,
# if the caller redirects this script's stderr (e.g. 2>&1), each stderr line from npm or git
# becomes an error record, and 'Stop' would abort the run. Failures are detected through
# $LASTEXITCODE.

$useColor = -not $env:NO_COLOR

function Write-Line {
    param(
        [string]$Text,
        [System.ConsoleColor]$Color = [System.ConsoleColor]::Gray
    )
    if ($useColor) {
        Write-Host $Text -ForegroundColor $Color
    }
    else {
        Write-Host $Text
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$namesFile = 'src/lib/names/upgradeNames.generated.ts'
# Matches the header line that changes on every run.
$dateLine = '^// Generated: '
$exitCode = 0

Push-Location -LiteralPath $repoRoot
try {
    foreach ($tool in 'node', 'npm', 'git') {
        if (-not (Get-Command $tool -CommandType Application -ErrorAction SilentlyContinue)) {
            Write-Line ('{0} is required but was not found on PATH.' -f $tool) Red
            exit 1
        }
    }
    $npm = (Get-Command npm -CommandType Application | Select-Object -First 1).Source
    $git = (Get-Command git -CommandType Application | Select-Object -First 1).Source

    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'node_modules') -PathType Container)) {
        Write-Line 'node_modules is missing. Run npm ci first.' Red
        exit 1
    }

    Write-Line '==> npm run generate:names' Cyan
    & $npm run generate:names
    if ($LASTEXITCODE -ne 0) {
        Write-Line ''
        Write-Line ('Generating names failed (exit code {0}). See the error above.' -f $LASTEXITCODE) Red
        exit 1
    }

    Write-Line ''
    & $git ls-files --error-unmatch -- $namesFile *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Line ('Names changed: {0} is new (not yet tracked by git).' -f $namesFile) Yellow
        Write-Line 'Review it, then commit it.' Yellow
        exit 0
    }

    & $git diff --quiet -I $dateLine -- $namesFile
    $namesDiffer = $LASTEXITCODE -ne 0

    if ($namesDiffer) {
        Write-Line 'Names changed:' Yellow
        & $git diff --stat -- $namesFile
        Write-Line ''
        Write-Line ('Review the changes (git diff {0}), then commit the file.' -f $namesFile) Yellow
    }
    else {
        # Only the date header (if anything) differs: put the committed file back.
        & $git diff --quiet -- $namesFile
        if ($LASTEXITCODE -ne 0) {
            & $git checkout -- $namesFile
        }
        Write-Line 'Names are up to date.' Green
    }
}
finally {
    Pop-Location
}

exit $exitCode
