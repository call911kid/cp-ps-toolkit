using System.Collections.Generic;

namespace CpToolkit.SnippetGenerator.Editors;

/// <summary>
/// Represents a fully resolved snippet ready for editor formatting.
/// </summary>
public sealed record ResolvedSnippet(
    string Tag,
    IReadOnlyList<string> Shortcuts,
    string Description,
    string Code);
