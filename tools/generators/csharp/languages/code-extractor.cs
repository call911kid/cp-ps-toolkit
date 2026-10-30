using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

namespace CpToolkit.SnippetGenerator.Languages;

/// <summary>
/// Provides length-preserving token masking and syntax body extraction.
/// </summary>
public static class CodeExtractor
{
    private static readonly Regex SnippetTagPattern = new(
        @"//\s*@snippet\s+([a-zA-Z0-9_\-]+)",
        RegexOptions.Compiled);

    private static readonly Regex NonCodePattern = new(
        @"@""(?:""""|[^""])*""|""(?:\\.|[^""\\])*""|'(?:\\.|[^'\\])*'|//.*?$|/\*.*?\*/",
        RegexOptions.Multiline | RegexOptions.Compiled);

    private static readonly Regex SanitizePattern = new(
        @"(?m)^\s*(//\s*@(snippet|require)\b|///)[^\r\n]*\r?\n?",
        RegexOptions.Compiled);

    private static readonly Regex SummaryPattern = new(
        @"///\s*<summary>\s*\r?\n\s*///\s*(.*?)\s*\r?\n\s*///\s*</summary>",
        RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex DeclaredTypePattern = new(
        @"^\s*(?:(?:public|static|internal|partial|sealed)\s+)*(?:class|struct|record|interface)\s+([A-Z][A-Za-z0-9_]*)",
        RegexOptions.Multiline | RegexOptions.Compiled);

    private static readonly Regex DeclaredMethodPattern = new(
        @"\b([A-Z][A-Za-z0-9_]*)\s*(?:<[^>]+>)?\s*\(",
        RegexOptions.Compiled);

    /// <summary>
    /// Extracts all snippets from source code using declarative syntax masking.
    /// </summary>
    public static IEnumerable<Snippet> ExtractSnippets(
        string text,
        bool allowExpressionBody,
        bool allowTrailingSemicolon = false)
    {
        var matches = SnippetTagPattern.Matches(text);
        if (matches.Count == 0) yield break;

        string masked = NonCodePattern.Replace(text, m => new string(' ', m.Length));

        foreach (Match m in matches)
        {
            string tag = m.Groups[1].Value;
            int pos = m.Index;
            string req = "";
            int codeStart = -1;

            while (pos < text.Length)
            {
                int nextLf = text.IndexOf('\n', pos);
                int lineEnd = nextLf != -1 ? nextLf : text.Length;
                string line = text[pos..lineEnd].Trim();

                if (line.StartsWith("//") || string.IsNullOrWhiteSpace(line))
                {
                    var reqMatch = Regex.Match(line, @"^//\s*@require\s+(.+)$");
                    if (reqMatch.Success) req = reqMatch.Groups[1].Value.Trim();
                    pos = nextLf != -1 ? nextLf + 1 : text.Length;
                }
                else
                {
                    codeStart = pos;
                    break;
                }
            }

            if (codeStart == -1) continue;

            string header = text[m.Index..codeStart];
            var descMatch = SummaryPattern.Match(header);
            string desc = descMatch.Success ? descMatch.Groups[1].Value.Trim() : tag;

            string rawCode = ExtractBody(text, masked, codeStart, allowExpressionBody, allowTrailingSemicolon);
            if (string.IsNullOrWhiteSpace(rawCode)) continue;

            string sanitized = SanitizePattern.Replace(rawCode, "");
            string code = Dedent(sanitized);

            var typeMatch = DeclaredTypePattern.Match(code);
            string? declaredName = typeMatch.Success
                ? typeMatch.Groups[1].Value
                : DeclaredMethodPattern.Match(code).Groups[1].Value;

            if (string.IsNullOrEmpty(declaredName)) declaredName = null;

            yield return new Snippet(tag, req, desc, code, declaredName);
        }
    }

    private static string ExtractBody(
        string original,
        string masked,
        int codeStart,
        bool allowExpressionBody,
        bool allowTrailingSemicolon)
    {
        string trimmedStart = original[codeStart..].TrimStart();
        if (trimmedStart.StartsWith("#define"))
        {
            int i = codeStart;
            while (i < original.Length)
            {
                int nextLf = original.IndexOf('\n', i);
                if (nextLf == -1) return original[codeStart..].TrimEnd();

                int lineEnd = nextLf;
                int prevCharIndex = lineEnd - 1;
                if (prevCharIndex >= 0 && original[prevCharIndex] == '\r') prevCharIndex--;

                if (prevCharIndex >= 0 && original[prevCharIndex] == '\\')
                {
                    i = nextLf + 1;
                }
                else
                {
                    return original[codeStart..lineEnd].TrimEnd();
                }
            }
            return original[codeStart..].TrimEnd();
        }

        int depth = 0;
        bool isExpr = false;

        for (int i = codeStart; i < masked.Length; i++)
        {
            char c = masked[i];

            if (allowExpressionBody && depth == 0 && c == '=' && i + 1 < masked.Length && masked[i + 1] == '>')
            {
                isExpr = true;
                i++;
            }
            else if (c == '{')
            {
                depth++;
            }
            else if (c == '}')
            {
                if (--depth == 0 && !isExpr)
                {
                    int end = i + 1;
                    if (allowTrailingSemicolon)
                    {
                        while (end < masked.Length && char.IsWhiteSpace(masked[end]) && masked[end] != '\n') end++;
                        if (end < masked.Length && masked[end] == ';') end++;
                    }
                    return original[codeStart..end];
                }
            }
            else if (c == ';' && isExpr && depth == 0)
            {
                return original[codeStart..(i + 1)];
            }
        }

        return string.Empty;
    }

    /// <summary>
    /// Removes the common leading whitespace from all lines of the code text.
    /// </summary>
    public static string Dedent(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var lines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
        int minIndent = int.MaxValue;

        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            int indent = 0;
            while (indent < line.Length && char.IsWhiteSpace(line[indent]))
            {
                indent++;
            }

            if (indent < minIndent)
            {
                minIndent = indent;
            }
        }

        if (minIndent == int.MaxValue || minIndent == 0)
        {
            return text.Trim();
        }

        var sb = new StringBuilder();
        foreach (var line in lines)
        {
            if (!string.IsNullOrWhiteSpace(line))
            {
                sb.AppendLine(line.Length >= minIndent ? line[minIndent..] : line.TrimStart());
            }
            else
            {
                sb.AppendLine();
            }
        }

        return sb.ToString().Trim();
    }
}
