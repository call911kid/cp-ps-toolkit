[CmdletBinding()]
param(
    [ValidateSet("vs", "vscode", "rider", "all")]
    [string]$Target = "all",
    [string]$OutputDir = $null,
    [string]$Lang = $null
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path "$PSScriptRoot/../../..").Path

$config = Get-Content (Join-Path $repoRoot "toolkit.config.json") | ConvertFrom-Json

if (-not $Lang) { $Lang = $config.defaultLanguage }
$langKey = $Lang.ToLower()

if (-not $config.languages.psobject.properties[$langKey]) {
    Write-Error "Unknown language '$Lang'. Available: $(($config.languages.psobject.properties.name) -join ', ')"
    exit 1
}

$langConfig = $config.languages.$langKey
$filePattern = "*.$($config.shortcutPrefix).$langKey"

class SnippetEntry {
    [string]$Tag
    [string]$Requires
    [string]$Description
    [string]$Code
    [string]$SourceFile
    [string]$DeclaredName
}

$snippetTagPattern = [System.Text.RegularExpressions.Regex]::new('//\s*@snippet\s+([a-zA-Z0-9_\-]+)')
$nonCodePattern = [System.Text.RegularExpressions.Regex]::new(
    '@"(?:""|[^"])*"|"(?:\\.|[^"\\])*"|''(?:\\.|[^''\\])*''|//.*?$|/\*.*?\*/',
    [System.Text.RegularExpressions.RegexOptions]::Multiline
)
$summaryPattern = [System.Text.RegularExpressions.Regex]::new(
    '///\s*<summary>\s*\r?\n\s*///\s*(.*?)\s*\r?\n\s*///\s*</summary>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)
$declaredTypePattern = [System.Text.RegularExpressions.Regex]::new(
    '^\s*(?:(?:public|static|internal|partial|sealed)\s+)*(?:class|struct|record|interface)\s+([A-Z][A-Za-z0-9_]*)',
    [System.Text.RegularExpressions.RegexOptions]::Multiline
)
$declaredMethodPattern = [System.Text.RegularExpressions.Regex]::new(
    '\b([A-Z][A-Za-z0-9_]*)\s*(?:<[^>]+>)?\s*\('
)

function Extract-Body(
    [string]$original,
    [string]$masked,
    [int]$codeStart,
    [bool]$allowExpr,
    [bool]$allowTrailingSemi
) {
    $trimmedStart = $original.Substring($codeStart).TrimStart()
    if ($trimmedStart.StartsWith("#define")) {
        $i = $codeStart
        while ($i -lt $original.Length) {
            $nextLf = $original.IndexOf("`n", $i)
            if ($nextLf -eq -1) { return $original.Substring($codeStart).TrimEnd() }

            $lineEnd = $nextLf
            $prevCharIndex = $lineEnd - 1
            if ($prevCharIndex -ge 0 -and $original[$prevCharIndex] -eq "`r") { $prevCharIndex-- }

            if ($prevCharIndex -ge 0 -and $original[$prevCharIndex] -eq '\') {
                $i = $nextLf + 1
            } else {
                return $original.Substring($codeStart, $lineEnd - $codeStart).TrimEnd()
            }
        }
        return $original.Substring($codeStart).TrimEnd()
    }

    $depth = 0
    $isExpr = $false
    $len = $masked.Length

    for ($i = $codeStart; $i -lt $len; $i++) {
        $c = $masked[$i]

        if ($allowExpr -and $depth -eq 0 -and $c -eq '=' -and ($i + 1) -lt $len -and $masked[$i + 1] -eq '>') {
            $isExpr = $true
            $i++
        }
        elseif ($c -eq '{') {
            $depth++
        }
        elseif ($c -eq '}') {
            $depth--
            if ($depth -eq 0 -and -not $isExpr) {
                $end = $i + 1
                if ($allowTrailingSemi) {
                    while ($end -lt $len -and [char]::IsWhiteSpace($masked[$end]) -and $masked[$end] -ne "`n") { $end++ }
                    if ($end -lt $len -and $masked[$end] -eq ';') { $end++ }
                }
                return $original.Substring($codeStart, $end - $codeStart)
            }
        }
        elseif ($c -eq ';' -and $isExpr -and $depth -eq 0) {
            return $original.Substring($codeStart, $i - $codeStart + 1)
        }
    }

    return ""
}

function Resolve-Dependencies(
    [string]$rootTag,
    [System.Collections.Generic.Dictionary[string, SnippetEntry]]$entries
) {
    $result = [System.Collections.Generic.List[string]]::new()
    $visited = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    $active = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

    $dfs = {
        param([string]$tag)
        if ($active.Contains($tag)) {
            Write-Warning "Circular dependency detected: $tag"
            return
        }
        if (-not $visited.Add($tag)) { return }

        [void]$active.Add($tag)
        if ($entries.ContainsKey($tag) -and -not [string]::IsNullOrWhiteSpace($entries[$tag].Requires)) {
            $deps = $entries[$tag].Requires -split '[,;\s]+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
            foreach ($d in $deps) {
                & $dfs $d
            }
        }
        [void]$active.Remove($tag)
        $result.Add($tag)
    }

    if ($entries.ContainsKey($rootTag) -and -not [string]::IsNullOrWhiteSpace($entries[$rootTag].Requires)) {
        $directDeps = $entries[$rootTag].Requires -split '[,;\s]+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        foreach ($d in $directDeps) {
            & $dfs $d
        }
    }
    return $result
}

function Get-SnippetShortcuts([string]$tag, [string]$declaredName, [string]$prefix) {
    $clean = $tag.Replace("-", "_")
    $s1 = "$prefix" + $clean.Replace("_", "")
    $s2 = "${prefix}_" + $clean
    $shortcuts = [System.Collections.Generic.List[string]]::new()
    [void]$shortcuts.Add($s1)
    [void]$shortcuts.Add($s2)
    [void]$shortcuts.Add($tag)

    if (-not [string]::IsNullOrWhiteSpace($declaredName)) {
        [void]$shortcuts.Add($declaredName)
    }

    $unique = [System.Collections.Generic.List[string]]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    foreach ($s in $shortcuts) {
        if ($seen.Add($s)) {
            [void]$unique.Add($s)
        }
    }
    return $unique.ToArray()
}

function Dedent-Code([string]$text) {
    if ([string]::IsNullOrWhiteSpace($text)) { return "" }

    $lines = $text -split "`r?\n"
    $minIndent = [int]::MaxValue

    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $indent = 0
        while ($indent -lt $line.Length -and [char]::IsWhiteSpace($line[$indent])) {
            $indent++
        }
        if ($indent -lt $minIndent) {
            $minIndent = $indent
        }
    }

    if ($minIndent -eq [int]::MaxValue -or $minIndent -eq 0) {
        return $text.Trim()
    }

    $sb = [System.Text.StringBuilder]::new()
    foreach ($line in $lines) {
        if (-not [string]::IsNullOrWhiteSpace($line)) {
            if ($line.Length -ge $minIndent) {
                [void]$sb.AppendLine($line.Substring($minIndent))
            } else {
                [void]$sb.AppendLine($line.TrimStart())
            }
        } else {
            [void]$sb.AppendLine()
        }
    }

    return $sb.ToString().Trim()
}

$files = Get-ChildItem -Path $repoRoot -Recurse -Filter $filePattern
$entries = [System.Collections.Generic.Dictionary[string, SnippetEntry]]::new([System.StringComparer]::OrdinalIgnoreCase)

$allowExpr = ($langKey -eq "cs")
$allowTrailingSemi = ($langKey -eq "cpp" -or $langKey -eq "cs")

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $tagMatches = $snippetTagPattern.Matches($content)
    if ($tagMatches.Count -eq 0) { continue }

    $masked = $nonCodePattern.Replace($content, { param($m) [string]::new(' ', $m.Length) })

    foreach ($m in $tagMatches) {
        $tag = $m.Groups[1].Value
        $pos = $m.Index
        $req = ""
        $codeStart = -1

        while ($pos -lt $content.Length) {
            $nextLf = $content.IndexOf("`n", $pos)
            $lineEnd = if ($nextLf -ne -1) { $nextLf } else { $content.Length }
            $line = $content.Substring($pos, $lineEnd - $pos).Trim()

            if ($line.StartsWith("//") -or [string]::IsNullOrWhiteSpace($line)) {
                if ($line -match '^//\s*@require\s+(.+)$') {
                    $req = $Matches[1].Trim()
                }
                $pos = if ($nextLf -ne -1) { $nextLf + 1 } else { $content.Length }
            }
            else {
                $codeStart = $pos
                break
            }
        }

        if ($codeStart -eq -1) { continue }

        $header = $content.Substring($m.Index, $codeStart - $m.Index)
        $descMatch = $summaryPattern.Match($header)
        $desc = if ($descMatch.Success) { $descMatch.Groups[1].Value.Trim() } else { $tag }

        $rawCode = Extract-Body -original $content -masked $masked -codeStart $codeStart -allowExpr $allowExpr -allowTrailingSemi $allowTrailingSemi
        if ([string]::IsNullOrWhiteSpace($rawCode)) { continue }

        $sanitized = [System.Text.RegularExpressions.Regex]::Replace($rawCode, '(?m)^\s*(//\s*@(snippet|require)\b|///)[^\r\n]*\r?\n?', '')
        $code = Dedent-Code -text $sanitized

        $typeMatch = $declaredTypePattern.Match($code)
        $declaredName = if ($typeMatch.Success) {
            $typeMatch.Groups[1].Value
        } else {
            $methodMatch = $declaredMethodPattern.Match($code)
            if ($methodMatch.Success) { $methodMatch.Groups[1].Value } else { $null }
        }

        $entry = [SnippetEntry]::new()
        $entry.Tag = $tag
        $entry.Requires = $req
        $entry.Description = $desc
        $entry.Code = $code
        $entry.SourceFile = $file.Name
        $entry.DeclaredName = $declaredName
        $entries[$tag] = $entry
    }
}

Write-Host "Discovered $($entries.Count) snippets for '$langKey' (*.$($config.shortcutPrefix).$langKey)." -ForegroundColor Cyan

$genVs = ($Target -eq "vs" -or $Target -eq "all")
$genVsCode = ($Target -eq "vscode" -or $Target -eq "all")
$genRider = ($Target -eq "rider" -or $Target -eq "all")

$baseDir = if ($config.outputDir) { $config.outputDir } elseif ($config.vsOutputDir) { $config.vsOutputDir } else { "cp-snippets" }

if ($genVs) {
    $targetDir = if ($OutputDir) { $OutputDir } else { Join-Path $repoRoot (Join-Path $baseDir "vs") }
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }

    $snippetsXml = [System.Text.StringBuilder]::new()
    [void]$snippetsXml.AppendLine('<?xml version="1.0" encoding="utf-8"?>')
    [void]$snippetsXml.AppendLine('<CodeSnippets xmlns="http://schemas.microsoft.com/VisualStudio/2005/CodeSnippet">')

    foreach ($kv in $entries.GetEnumerator()) {
        $entry = $kv.Value
        $depTags = Resolve-Dependencies -rootTag $entry.Tag -entries $entries

        $sb = [System.Text.StringBuilder]::new()
        foreach ($depTag in $depTags) {
            if ($entries.ContainsKey($depTag)) {
                [void]$sb.AppendLine($entries[$depTag].Code)
                [void]$sb.AppendLine()
            }
        }
        [void]$sb.Append($entry.Code)
        $fullCode = $sb.ToString().TrimEnd()

        $escapedDesc = [System.Security.SecurityElement]::Escape($entry.Description)
        $escapedTag = [System.Security.SecurityElement]::Escape($entry.Tag)
        $shortcuts = Get-SnippetShortcuts -tag $entry.Tag -declaredName $entry.DeclaredName -prefix $config.shortcutPrefix
        foreach ($shortcut in $shortcuts) {
            $escapedShortcut = [System.Security.SecurityElement]::Escape($shortcut)
            [void]$snippetsXml.AppendLine(@"
    <CodeSnippet Format="1.0.0">
        <Header>
            <Title>$escapedTag ($escapedShortcut)</Title>
            <Shortcut>$escapedShortcut</Shortcut>
            <Description>$escapedDesc</Description>
            <SnippetTypes>
                <SnippetType>Expansion</SnippetType>
            </SnippetTypes>
        </Header>
        <Snippet>
            <Code Language="$($langConfig.vsLanguage)"><![CDATA[$fullCode`$end`$]]></Code>
        </Snippet>
    </CodeSnippet>
"@)
        }
    }

    [void]$snippetsXml.AppendLine('</CodeSnippets>')
    $vsFile = Join-Path $targetDir "cp-toolkit-$($langConfig.vsLanguage).snippet"
    [System.IO.File]::WriteAllText($vsFile, $snippetsXml.ToString(), [System.Text.Encoding]::UTF8)
    Write-Host "[Visual Studio ($($langConfig.vsLanguage))] Generated $($entries.Count) snippets in $vsFile" -ForegroundColor Green
}

if ($genVsCode) {
    $vsCodeMap = [ordered]@{}

    foreach ($kv in $entries.GetEnumerator()) {
        $entry = $kv.Value
        $depTags = Resolve-Dependencies -rootTag $entry.Tag -entries $entries

        $bodyLines = [System.Collections.Generic.List[string]]::new()
        foreach ($depTag in $depTags) {
            if ($entries.ContainsKey($depTag)) {
                $depLines = $entries[$depTag].Code -split "`r?\n"
                foreach ($dl in $depLines) { $bodyLines.Add($dl) }
                $bodyLines.Add("")
            }
        }
        $mainLines = $entry.Code -split "`r?\n"
        foreach ($ml in $mainLines) { $bodyLines.Add($ml) }

        $shortcuts = Get-SnippetShortcuts -tag $entry.Tag -declaredName $entry.DeclaredName -prefix $config.shortcutPrefix

        $vsCodeMap[$entry.Tag] = [ordered]@{
            scope = $langConfig.vsLanguage
            prefix = $shortcuts
            body = $bodyLines
            description = $entry.Description
        }
    }

    $json = $vsCodeMap | ConvertTo-Json -Depth 10

    $targetDir = if ($OutputDir) { $OutputDir } else { Join-Path $repoRoot (Join-Path $baseDir "vscode") }
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }

    $outFile = Join-Path $targetDir "cp-toolkit-$($langConfig.vsLanguage).code-snippets"
    [System.IO.File]::WriteAllText($outFile, $json, [System.Text.Encoding]::UTF8)
    Write-Host "[VS Code ($($langConfig.vsLanguage))] Generated $($entries.Count) snippets in $outFile" -ForegroundColor Green
}

if ($genRider) {
    $targetDir = if ($OutputDir) { $OutputDir } else { Join-Path $repoRoot (Join-Path $baseDir "rider") }
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }

    $contextName = if ($langConfig.vsLanguage -eq "cpp") { "cpp" } else { "csharp" }
    $riderXml = [System.Text.StringBuilder]::new()
    [void]$riderXml.AppendLine('<templateSet group="cp-ps-toolkit">')

    foreach ($kv in $entries.GetEnumerator()) {
        $entry = $kv.Value
        $depTags = Resolve-Dependencies -rootTag $entry.Tag -entries $entries

        $sb = [System.Text.StringBuilder]::new()
        foreach ($depTag in $depTags) {
            if ($entries.ContainsKey($depTag)) {
                [void]$sb.AppendLine($entries[$depTag].Code)
                [void]$sb.AppendLine()
            }
        }
        [void]$sb.Append($entry.Code)
        $rawCode = $sb.ToString().TrimEnd()

        $escapedVal = [System.Security.SecurityElement]::Escape($rawCode.Replace('$', '$$') + '$END$').Replace("`r", '').Replace("`n", '&#10;')
        $escapedDesc = [System.Security.SecurityElement]::Escape($entry.Description)

        $shortcuts = Get-SnippetShortcuts -tag $entry.Tag -declaredName $entry.DeclaredName -prefix $config.shortcutPrefix
        foreach ($shortcut in $shortcuts) {
            [void]$riderXml.AppendLine(@"
  <template name="$shortcut" value="$escapedVal" description="$escapedDesc" toReformat="true" toShortenFQNames="true">
    <context>
      <option name="$contextName" value="true" />
    </context>
  </template>
"@)
        }
    }

    [void]$riderXml.AppendLine('</templateSet>')
    $riderFile = Join-Path $targetDir "cp-toolkit-$($langConfig.vsLanguage).xml"
    [System.IO.File]::WriteAllText($riderFile, $riderXml.ToString(), [System.Text.Encoding]::UTF8)
    Write-Host "[Rider ($($langConfig.vsLanguage))] Generated $($entries.Count) snippets in $riderFile" -ForegroundColor Green
}
