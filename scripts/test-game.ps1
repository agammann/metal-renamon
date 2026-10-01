param([string]$JdkHome = $env:JAVA_HOME)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$buildRoot = Join-Path $repoRoot 'work/test-classes'
New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null
if ($JdkHome) {
    $javac = Join-Path $JdkHome 'bin/javac.exe'
    $java = Join-Path $JdkHome 'bin/java.exe'
} else {
    $javac = (Get-Command javac -ErrorAction Stop).Source
    $java = (Get-Command java -ErrorAction Stop).Source
}
$sources = Get-ChildItem -LiteralPath (Join-Path $repoRoot 'Metal_Slug/src') -Filter '*.java' | ForEach-Object FullName
& $javac --release 8 -Xlint:-options -d $buildRoot $sources (Join-Path $repoRoot 'tests/GameRegression.java')
if ($LASTEXITCODE -ne 0) { throw 'Regression compilation failed' }
& $java '-Djava.awt.headless=true' "-Dmetalrenamon.assets=$repoRoot/Metal_Slug" -cp $buildRoot GameRegression
if ($LASTEXITCODE -ne 0) { throw 'Game regression failed' }
