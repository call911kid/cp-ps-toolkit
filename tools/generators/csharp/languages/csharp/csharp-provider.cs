using System.Collections.Generic;

namespace CpToolkit.SnippetGenerator.Languages.CSharp;

/// <summary>
/// Extracts C# algorithm snippets using declarative syntax masking.
/// </summary>
public sealed class CSharpProvider : ILanguageProvider
{
    /// <summary>
    /// Gets the language identifier key matching configuration.
    /// </summary>
    public string LanguageKey => "cs";

    /// <summary>
    /// Extracts all snippets defined in a C# source file.
    /// </summary>
    public IEnumerable<Snippet> Extract(string filePath, string text) =>
        CodeExtractor.ExtractSnippets(text, allowExpressionBody: true);
}
