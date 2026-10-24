$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$stageRoot = Join-Path $root '.submission-build\github-root'
$stage = Join-Path $stageRoot 'BrandComplianceCopilot'
$zip = Join-Path $root 'output\BrandGate_Round2_Source.zip'
$resolvedRoot = (Resolve-Path $root).Path
if (Test-Path -LiteralPath $stageRoot) {
    $resolvedStage = [System.IO.Path]::GetFullPath($stageRoot)
    if (-not $resolvedStage.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing to clean a package stage outside the project.' }
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stage | Out-Null
function Copy-PackageTree([string]$source, [string]$destination) {
    foreach ($entry in Get-ChildItem -LiteralPath $source -Force) {
        if ($entry.Name -in @('.git','.submission-build','node_modules','dist','qa','tmp','.pytest_cache','__pycache__','.mypy_cache','.ruff_cache','coverage','playwright-report','test-results','venv','.venv','renders')) { continue }
        if ($entry.Name -eq 'BrandGate_Round2_Source.zip') { continue }
        if ($entry.PSIsContainer) {
            $target = Join-Path $destination $entry.Name
            New-Item -ItemType Directory -Force -Path $target | Out-Null
            Copy-PackageTree $entry.FullName $target
        } else {
            if ($entry.Name -like '.env*' -and $entry.Name -ne '.env.example') { continue }
            if ($entry.Extension -in @('.pyc','.log')) { continue }
            Copy-Item -LiteralPath $entry.FullName -Destination (Join-Path $destination $entry.Name) -Force
        }
    }
}
Copy-PackageTree $root $stage
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal
Write-Output "Created $zip"
