<#
.SYNOPSIS
    Runs the same checks as CI: lint, format check, tests and build.

.DESCRIPTION
    Runs the project's npm scripts in CI order (lint, format:check, test, build) from the repo
    root, wherever the script is called from. Each step's output is shown as it runs, followed by
    a summary table with PASS/FAIL/SKIPPED and the duration of each step.

    Before running anything it checks that node and npm are installed, that the Node major
    version matches .nvmrc, and that node_modules exists.

    Every step runs even if an earlier one fails, unless -FailFast is given.

    Works in Windows PowerShell 5.1 and PowerShell 7. Set the NO_COLOR environment variable to
    turn off colours.

.PARAMETER FailFast
    Stop at the first failing step. Remaining steps are reported as SKIPPED.

.EXAMPLE
    npm run check

    Runs all checks through the npm script (uses -ExecutionPolicy Bypass).

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1

    Runs all checks directly with Windows PowerShell.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1 -FailFast

    Stops at the first failing step.

.OUTPUTS
    None. Exit code 0 if every step passed, 1 if a step failed or a preflight check failed.
#>
[CmdletBinding()]
param(
    [switch]$FailFast
)

Set-StrictMode -Version Latest
# $ErrorActionPreference stays at its default ('Continue') on purpose: in Windows PowerShell 5.1,
# if the caller redirects this script's stderr (e.g. 2>&1), each stderr line from npm becomes an
# error record, and 'Stop' would abort the run. Failures are detected through $LASTEXITCODE.

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

function Get-MajorVersion {
    param([string]$Version)
    $clean = $Version.Trim().TrimStart('v', 'V')
    $major = 0
    if ([int]::TryParse(($clean -split '\.')[0], [ref]$major)) {
        return $major
    }
    return $null
}

function Format-Seconds {
    param([double]$Seconds)
    return $Seconds.ToString('0.0', [System.Globalization.CultureInfo]::InvariantCulture) + 's'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$exitCode = 0

Push-Location -LiteralPath $repoRoot
try {
    # --- Preflight -----------------------------------------------------------------------------
    $node = Get-Command node -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    $npm = Get-Command npm -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $node -or -not $npm) {
        Write-Line 'Node.js and npm are required but were not found on PATH.' Red
        Write-Line 'Install the Node version listed in .nvmrc, then try again.' Red
        exit 1
    }

    $nvmrcPath = Join-Path $repoRoot '.nvmrc'
    if (-not (Test-Path -LiteralPath $nvmrcPath)) {
        Write-Line '.nvmrc not found in the repo root.' Red
        exit 1
    }
    $expectedRaw = (Get-Content -LiteralPath $nvmrcPath -TotalCount 1).Trim()
    $expectedMajor = Get-MajorVersion $expectedRaw
    $foundRaw = (& $node.Source -v | Out-String).Trim()
    $foundMajor = Get-MajorVersion $foundRaw
    if ($null -eq $expectedMajor -or $expectedMajor -ne $foundMajor) {
        Write-Line 'Node version mismatch.' Red
        Write-Line ("  Expected: Node {0} (from .nvmrc)" -f $expectedRaw) Red
        Write-Line ("  Found:    {0}" -f $foundRaw) Red
        Write-Line 'Switch Node versions (e.g. nvm use) and try again.' Red
        exit 1
    }

    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'node_modules') -PathType Container)) {
        Write-Line 'node_modules is missing. Run npm ci first.' Red
        exit 1
    }

    Write-Line ("Node {0}, npm {1}" -f $foundRaw, (& $npm.Source -v | Out-String).Trim()) DarkGray

    # --- Steps (same order as .github/workflows/ci.yml) -----------------------------------------
    $steps = @(
        @{ Name = 'Lint'; Script = 'lint' },
        @{ Name = 'Format'; Script = 'format:check' },
        @{ Name = 'Test'; Script = 'test' },
        @{ Name = 'Build'; Script = 'build' }
    )
    $results = New-Object System.Collections.Generic.List[object]
    $stopped = $false
    $total = [System.Diagnostics.Stopwatch]::StartNew()

    foreach ($step in $steps) {
        if ($stopped) {
            $results.Add([pscustomobject]@{ Step = $step.Name; Result = 'SKIPPED'; Seconds = $null })
            continue
        }

        Write-Line ''
        Write-Line ("==> {0}: npm run {1}" -f $step.Name, $step.Script) Cyan
        $timer = [System.Diagnostics.Stopwatch]::StartNew()
        & $npm.Source run $step.Script
        $stepExit = $LASTEXITCODE
        $timer.Stop()

        if ($stepExit -eq 0) {
            $result = 'PASS'
        }
        else {
            $result = 'FAIL'
            $exitCode = 1
            if ($FailFast) {
                $stopped = $true
            }
        }
        $results.Add([pscustomobject]@{ Step = $step.Name; Result = $result; Seconds = $timer.Elapsed.TotalSeconds })
    }
    $total.Stop()

    # --- Summary -------------------------------------------------------------------------------
    $colors = @{ PASS = 'Green'; FAIL = 'Red'; SKIPPED = 'Yellow' }
    Write-Line ''
    Write-Line 'Summary'
    Write-Line ('{0,-8} {1,-8} {2,8}' -f 'Step', 'Result', 'Time')
    Write-Line ('{0,-8} {1,-8} {2,8}' -f '----', '------', '----')
    foreach ($r in $results) {
        if ($null -eq $r.Seconds) {
            $time = '-'
        }
        else {
            $time = Format-Seconds $r.Seconds
        }
        Write-Line ('{0,-8} {1,-8} {2,8}' -f $r.Step, $r.Result, $time) $colors[$r.Result]
    }

    $failed = @($results | Where-Object { $_.Result -eq 'FAIL' }).Count
    $skipped = @($results | Where-Object { $_.Result -eq 'SKIPPED' }).Count
    Write-Line ('{0,-8} {1,-8} {2,8}' -f '----', '------', '----')
    if ($exitCode -eq 0) {
        $overall = 'PASS'
        $detail = 'all {0} steps passed' -f $results.Count
    }
    else {
        $overall = 'FAIL'
        $detail = '{0} failed, {1} skipped' -f $failed, $skipped
    }
    Write-Line ('{0,-8} {1,-8} {2,8}  ({3})' -f 'Total', $overall, (Format-Seconds $total.Elapsed.TotalSeconds), $detail) $colors[$overall]
}
finally {
    Pop-Location
}

exit $exitCode
