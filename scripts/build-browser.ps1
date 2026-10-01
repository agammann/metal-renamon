param([string]$JdkHome = $env:JAVA_HOME)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$buildRoot = Join-Path $repoRoot 'work/browser-classes'
New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null
if ($JdkHome) {
    $javac = Join-Path $JdkHome 'bin/javac.exe'
    $jar = Join-Path $JdkHome 'bin/jar.exe'
} else {
    $javac = (Get-Command javac -ErrorAction Stop).Source
    $jar = (Get-Command jar -ErrorAction Stop).Source
}
$sources = Get-ChildItem -LiteralPath (Join-Path $repoRoot 'Metal_Slug/src') -Filter '*.java' | ForEach-Object FullName
& $javac --release 8 -Xlint:-options -d $buildRoot $sources
if ($LASTEXITCODE -ne 0) { throw 'Java compilation failed' }
& $jar cfe (Join-Path $repoRoot 'web/metal-renamon.jar') MetalSlug -C $buildRoot . -C (Join-Path $repoRoot 'web') EZ-LICENSE.txt
if ($LASTEXITCODE -ne 0) { throw 'JAR packaging failed' }
Write-Output 'Built web/metal-renamon.jar'
