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
$required = @('index.html','coursework.html','enrollment.html','privacy.html','styles.css','script.js','assets/logo.png','assets/rey-arth-rublico.jpg')
foreach ($name in $required) {
    if (-not (Test-ExactPath ([IO.Path]::GetFullPath((Join-Path $root $name))))) { $failures.Add("Missing required file: $name") }
}
$subjectPrefix = (Join-Path $root 'Coursework') + [IO.Path]::DirectorySeparatorChar
$subjects = @($files | Where-Object { $_.FullName.StartsWith($subjectPrefix,[StringComparison]::Ordinal) })
if ($subjects.Count -ne 11) { $failures.Add("Expected 11 public subject pages, found $($subjects.Count)") }
foreach ($file in $subjects) {
    $page = [IO.File]::ReadAllText($file.FullName)
    if ($page -notmatch '(?i)Back to Learning Hub') { $failures.Add("Missing Learning Hub return link: $($file.Name)") }
    if ($page -notmatch '(?i)<h1\b') { $failures.Add("Missing subject heading: $($file.Name)") }
    if ($page -notmatch '(?i)<noscript\b') { $failures.Add("Missing JavaScript fallback note: $($file.Name)") }
    if ($page -notmatch 'href="../../privacy\.html"') { $failures.Add("Missing privacy link: $($file.Name)") }
}
$portal = [IO.File]::ReadAllText((Join-Path $root 'coursework.html'))
$courseLinks = [regex]::Matches($portal, 'href="Coursework/(?:MSU-IIT|SPC)/[^"]+\.html"').Count
if ($courseLinks -ne 11) { $failures.Add("Expected 11 Open Course links but found $courseLinks") }
$forbidden = '(?i)(enrollment\.html\?subject=|course-enroll-btn|subject-enrollment-callout|Enroll Now|script\.google\.com/macros/|<form\b|<input\b[^>]*type\s*=\s*["'']password)'
foreach ($page in $files) {
    $html = [IO.File]::ReadAllText($page.FullName)
    if ($html -match $forbidden) { $failures.Add("Student registration interface found: $($page.FullName)") }
}
$retiredFiles = @(
    'enrollment.css',
    'js/enrollment-preview.js',
    'js/cet154-registration-config.js',
    'apps-script/cet154-registration/Code.gs',
    'apps-script/cet154-registration/Index.html',
    'apps-script/cet154-registration/SETUP.md',
    'tests/cet154-registration.test.mjs',
    'tests/cet154-registration-activation.test.mjs',
    'account.html','quiz.html','results.html','instructor.html',
    'js/app.js','js/account.js','js/config.js','js/core.js','js/instructor.js',
    'js/quiz.js','js/results.js','js/return-url.js'
)
foreach ($item in $retiredFiles) {
    if (Test-Path -LiteralPath (Join-Path $root $item)) { $failures.Add("Retired account or registration file still present: $item") }
}
if ($failures.Count) {
    $failures | ForEach-Object { Write-Output "FAIL: $_" }
    throw "$($failures.Count) static checks failed."
}
Write-Output "PASS: $($files.Count) HTML files, $checked internal references, $($subjects.Count) public subject pages; no registration forms or retired account files."
