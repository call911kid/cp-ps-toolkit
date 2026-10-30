using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace CpToolkit.SnippetGenerator.Editors;

/// <summary>
/// Generates snippet definitions for Visual Studio Code in JSON format.
/// </summary>
public sealed class VsCodeFormatter : IEditorFormatter
{
    /// <summary>
    /// Gets the unique CLI target identifier for this editor.
    /// </summary>
    public string EditorKey => "vscode";

    /// <summary>
    /// Gets the default output filename for the specified language.
    /// </summary>
    public string GetFileName(string vsLang) => $"cp-toolkit-{vsLang}.code-snippets";

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

        string dir = config.TryGetProperty("vscodeOutputDir", out var vscDir) && !string.IsNullOrWhiteSpace(vscDir.GetString())
            ? vscDir.GetString()!
            : Path.Combine(baseDir, "vscode");

        return Path.Combine(root, dir, GetFileName(vsLang));
    }

    /// <summary>
    /// Formats resolved snippets into the editor-specific file content.
    /// </summary>
    public string Format(IReadOnlyList<ResolvedSnippet> snippets, string vsLang)
    {
        var map = new Dictionary<string, object>();

        foreach (var snippet in snippets)
        {
            map[snippet.Tag] = new
            {
                scope = vsLang,
                prefix = snippet.Shortcuts,
                body = snippet.Code.Split("\r\n").SelectMany(l => l.Split('\n')).ToArray(),
                description = snippet.Description
            };
        }

        return JsonSerializer.Serialize(map, new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        });
    }
}
