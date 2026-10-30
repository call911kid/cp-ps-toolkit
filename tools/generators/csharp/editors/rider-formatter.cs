using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;

namespace CpToolkit.SnippetGenerator.Editors;

/// <summary>
/// Generates Live Template definitions for JetBrains Rider in XML format.
/// </summary>
public sealed class RiderFormatter : IEditorFormatter
{
    /// <summary>
    /// Gets the unique CLI target identifier for this editor.
    /// </summary>
    public string EditorKey => "rider";

    /// <summary>
    /// Gets the default output filename for the specified language.
    /// </summary>
    public string GetFileName(string vsLang) => $"cp-toolkit-{vsLang}.xml";

    /// <summary>
    /// Gets the default file path where the generated snippets should be saved.
    /// </summary>
    public string GetDefaultFilePath(string root, JsonElement config, string vsLang)
    {
        string baseDir = config.TryGetProperty("outputDir", out var od) && !string.IsNullOrWhiteSpace(od.GetString())
            ? od.GetString()!
            : (config.TryGetProperty("vsOutputDir", out var vd) && !string.IsNullOrWhiteSpace(vd.GetString())
                ? vd.GetString()!
                : "cp-snippets");

        string dir = config.TryGetProperty("riderOutputDir", out var rd) && !string.IsNullOrWhiteSpace(rd.GetString())
            ? rd.GetString()!
            : Path.Combine(baseDir, "rider");

        return Path.Combine(root, dir, GetFileName(vsLang));
    }

    /// <summary>
    /// Formats resolved snippets into the editor-specific file content.
    /// </summary>
    public string Format(IReadOnlyList<ResolvedSnippet> snippets, string vsLang)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<templateSet group=\"cp-ps-toolkit\">");

        string contextName = vsLang.Equals("cpp", StringComparison.OrdinalIgnoreCase) ? "cpp" : "csharp";

        foreach (var snippet in snippets)
        {
            string value = FormatAttributeValue(snippet.Code);
            string desc = EscapeXml(snippet.Description);

            foreach (var shortcut in snippet.Shortcuts)
            {
                sb.AppendLine($@"  <template name=""{shortcut}"" value=""{value}"" description=""{desc}"" toReformat=""true"" toShortenFQNames=""true"">
    <context>
      <option name=""{contextName}"" value=""true"" />
    </context>
  </template>");
            }
        }

        sb.AppendLine("</templateSet>");
        return sb.ToString();
    }

    /// <summary>
    /// Formats snippet code into a JetBrains template XML attribute with escaped variables and newlines.
    /// </summary>
    private static string FormatAttributeValue(string code) =>
        code.Replace("$", "$$")
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("\r", "")
            .Replace("\n", "&#10;") + "$END$";

    /// <summary>
    /// Escapes XML special characters for inclusion within XML attributes.
    /// </summary>
    private static string EscapeXml(string text) =>
        text.Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;");
}
