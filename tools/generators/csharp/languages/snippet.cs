namespace CpToolkit.SnippetGenerator.Languages;

/// <summary>
/// Represents an extracted algorithm snippet and its metadata.
/// </summary>
public sealed record Snippet(string Tag, string Requires, string Description, string Code, string? DeclaredName = null);
