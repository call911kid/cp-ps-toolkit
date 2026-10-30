using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;

namespace CpToolkit.SnippetGenerator.Editors;

/// <summary>
/// Generates code snippet definitions for Visual Studio in XML format.
/// </summary>
public sealed class VisualStudioFormatter : IEditorFormatter
{
    /// <summary>
    /// Gets the unique CLI target identifier for this editor.
    /// </summary>
    public string EditorKey => "vs";

    /// <summary>
    /// Gets the default output filename for the specified language.
    /// </summary>
    public string GetFileName(string vsLang) => $"cp-toolkit-{vsLang}.snippet";

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

        string dir = config.TryGetProperty("vsSnippetDir", out var vsDir) && !string.IsNullOrWhiteSpace(vsDir.GetString())
            ? vsDir.GetString()!
            : Path.Combine(baseDir, "vs");

        return Path.Combine(root, dir, GetFileName(vsLang));
    }

    /// <summary>
    /// Formats resolved snippets into the editor-specific file content.
    /// </summary>
    public string Format(IReadOnlyList<ResolvedSnippet> snippets, string vsLang)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
        sb.AppendLine("<CodeSnippets xmlns=\"http://schemas.microsoft.com/VisualStudio/2005/CodeSnippet\">");

        foreach (var snippet in snippets)
        {
            string desc = EscapeXml(snippet.Description);
            string tag = EscapeXml(snippet.Tag);

            foreach (var shortcut in snippet.Shortcuts)
            {
                string sc = EscapeXml(shortcut);
                sb.AppendLine($@"    <CodeSnippet Format=""1.0.0"">
        <Header>
            <Title>{tag} ({sc})</Title>
            <Shortcut>{sc}</Shortcut>
            <Description>{desc}</Description>
            <SnippetTypes>
                <SnippetType>Expansion</SnippetType>
            </SnippetTypes>
        </Header>
        <Snippet>
            <Code Language=""{vsLang}""><![CDATA[{snippet.Code}$end$]]></Code>
        </Snippet>
    </CodeSnippet>");
            }
        }

        sb.AppendLine("</CodeSnippets>");
        return sb.ToString();
    }

    /// <summary>
    /// Escapes XML special characters for inclusion within XML elements.
    /// </summary>
    private static string EscapeXml(string text) =>
        text.Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&apos;");
}
