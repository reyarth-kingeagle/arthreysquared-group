[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd([IO.Path]::DirectorySeparatorChar)
$prefix = $root + [IO.Path]::DirectorySeparatorChar
$failures = [Collections.Generic.List[string]]::new()
$checked = 0

function Test-ExactPath([string]$path) {
    if (-not $path.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -and $path -ne $root) { return $false }
    $current = $root
    $relative = $path.Substring($root.Length).TrimStart([IO.Path]::DirectorySeparatorChar)
    foreach ($part in ($relative -split '[\\/]')) {
        if (-not $part) { continue }
        $matches = @(Get-ChildItem -LiteralPath $current -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -ceq $part })
        if ($matches.Count -ne 1) { return $false }
        $current = $matches[0].FullName
    }
    return $true
}

$files = @(Get-ChildItem -LiteralPath $root -Filter '*.html' -File -Recurse | Where-Object { $_.FullName -notmatch '[\\/](?:\.git|node_modules)[\\/]' })
foreach ($file in $files) {
    $label = $file.FullName.Substring($prefix.Length).Replace('\','/')
    $html = [IO.File]::ReadAllText($file.FullName)
    if ([string]::IsNullOrWhiteSpace($html)) { $failures.Add("Empty HTML: $label"); continue }
    $pattern = '(?is)(href|src)\s*=\s*["''](?<url>[^"'']*)["'']'
    foreach ($match in [regex]::Matches($html, $pattern)) {
        $url = [Net.WebUtility]::HtmlDecode($match.Groups['url'].Value.Trim())
        if (-not $url) { continue }
        if ($url -match '^javascript:') { $failures.Add("Unsafe javascript link: $label $url"); continue }
        if ($url -match '^[A-Za-z][A-Za-z0-9+.-]*:' -or $url.StartsWith('//')) {
            if (($label -eq 'coursework.html' -or $label.StartsWith('Coursework/')) -and $url -match '^https?://(?:www\.)?drive\.google\.com/?(?:\?.*)?$') { $failures.Add("Placeholder Drive homepage: $label") }
            continue
        }
        $relativeUrl = [Uri]::UnescapeDataString(($url -split '[?#]',2)[0])
        $target = if ($relativeUrl.StartsWith('/')) { Join-Path $root $relativeUrl.TrimStart('/') } elseif ($relativeUrl) { Join-Path $file.DirectoryName $relativeUrl } else { $file.FullName }
        $target = [IO.Path]::GetFullPath($target)
        if (Test-Path -LiteralPath $target -PathType Container) { $target = Join-Path $target 'index.html' }
        if (-not (Test-ExactPath $target)) { $failures.Add("Missing or case-mismatched link: $label -> $url"); continue }
        $checked++
        if ($url.Contains('#') -and [IO.Path]::GetExtension($target) -eq '.html') {
            $fragment = [Uri]::UnescapeDataString(($url -split '#',2)[1])
            if ($fragment) {
                $targetText = [IO.File]::ReadAllText($target)
                $ids = @([regex]::Matches($targetText,'(?is)(?:id|name)\s*=\s*["''](?<value>[^"'']*)["'']') | ForEach-Object { [Net.WebUtility]::HtmlDecode($_.Groups['value'].Value) })
                if ($ids -cnotcontains $fragment) { $failures.Add("Missing anchor: $label -> $url") }
            }
        }
    }
}
$required = @('index.html','coursework.html','account.html','account.css','styles.css','script.js','course-builder.html','course-builder.css','js/course-builder.js','js/student-account.js','js/course-catalog.mjs','js/account-config.js','js/student-record-model.mjs','js/blueprint-model.mjs','assets/logo.png','assets/rey-arth-rublico.jpg')
foreach ($name in $required) {
    if (-not (Test-ExactPath ([IO.Path]::GetFullPath((Join-Path $root $name))))) { $failures.Add("Missing required file: $name") }
}
$subjectPrefix = (Join-Path $root 'Coursework') + [IO.Path]::DirectorySeparatorChar
$subjects = @($files | Where-Object { $_.FullName.StartsWith($subjectPrefix,[StringComparison]::Ordinal) })
foreach ($file in $subjects) {
    $text = [IO.File]::ReadAllText($file.FullName)
    if ($text -notmatch '(?i)Back to Student Portal') { $failures.Add("Missing portal return link: $($file.Name)") }
    if ($text -notmatch '(?i)<h1\b') { $failures.Add("Missing subject heading: $($file.Name)") }
    if ($text -notmatch '(?i)<noscript\b') { $failures.Add("Missing JavaScript fallback note: $($file.Name)") }
}
if ($failures.Count) {
    $failures | ForEach-Object { Write-Output "FAIL: $_" }
    throw "$($failures.Count) static checks failed."
}
Write-Output "PASS: $($files.Count) HTML files, $checked internal references, and $($subjects.Count) subject pages checked with exact path case."
Write-Output 'Static checks do not activate registration, save student credentials, or test future account authentication and Google Sheets integrations.'
