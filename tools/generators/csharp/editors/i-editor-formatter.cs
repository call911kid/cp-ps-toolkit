using System.Collections.Generic;
using System.Text.Json;

namespace CpToolkit.SnippetGenerator.Editors;

/// <summary>
/// Formats extracted algorithm snippets into editor-specific template or snippet definitions.
/// </summary>
public interface IEditorFormatter
{
    /// <summary>
    /// Gets the unique CLI target identifier for this editor.
    /// </summary>
    string EditorKey { get; }

    /// <summary>
    /// Gets the default output filename for the specified language.
    /// </summary>
    string GetFileName(string vsLang);

    /// <summary>
    /// Gets the default file path where the generated snippets should be saved.
    /// </summary>
    string GetDefaultFilePath(string root, JsonElement config, string vsLang);

    /// <summary>
    /// Formats resolved snippets into the editor-specific file content.
    /// </summary>
    string Format(IReadOnlyList<ResolvedSnippet> snippets, string vsLang);
}
