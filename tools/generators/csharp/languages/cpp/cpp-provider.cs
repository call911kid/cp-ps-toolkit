using System.Collections.Generic;

namespace CpToolkit.SnippetGenerator.Languages.Cpp;

/// <summary>
/// Extracts C++ algorithm snippets using declarative syntax masking.
/// </summary>
public sealed class CppProvider : ILanguageProvider
{
    /// <summary>
    /// Gets the language identifier key matching configuration.
    /// </summary>
    public string LanguageKey => "cpp";

    /// <summary>
    /// Extracts all snippets defined in a C++ source file.
    /// </summary>
    public IEnumerable<Snippet> Extract(string filePath, string text) =>
        CodeExtractor.ExtractSnippets(text, allowExpressionBody: false, allowTrailingSemicolon: true);
}
