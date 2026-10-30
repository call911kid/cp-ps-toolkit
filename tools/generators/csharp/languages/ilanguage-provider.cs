using System.Collections.Generic;

namespace CpToolkit.SnippetGenerator.Languages;

/// <summary>
/// Defines a language-specific snippet extractor.
/// </summary>
public interface ILanguageProvider
{
    /// <summary>
    /// Gets the language identifier key matching configuration.
    /// </summary>
    string LanguageKey { get; }

    /// <summary>
    /// Extracts all snippets defined in a source file.
    /// </summary>
    IEnumerable<Snippet> Extract(string filePath, string text);
}
