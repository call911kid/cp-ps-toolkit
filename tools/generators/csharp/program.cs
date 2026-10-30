using System.Text;
using System.Text.Json;
using CpToolkit.SnippetGenerator.Editors;
using CpToolkit.SnippetGenerator.Languages;
using CpToolkit.SnippetGenerator.Languages.CSharp;
using CpToolkit.SnippetGenerator.Languages.Cpp;

var providers = new ILanguageProvider[]
{
    new CSharpProvider(),
    new CppProvider()
}.ToDictionary(p => p.LanguageKey, StringComparer.OrdinalIgnoreCase);

var formatters = new IEditorFormatter[]
{
    new VsCodeFormatter(),
    new VisualStudioFormatter(),
    new RiderFormatter()
};

string root = Directory.GetCurrentDirectory();
using var cfgDoc = JsonDocument.Parse(File.ReadAllText(Path.Combine(root, "toolkit.config.json")));
var cfg = cfgDoc.RootElement;
string prefix = cfg.GetProperty("shortcutPrefix").GetString()!;
var langs = cfg.GetProperty("languages");

string target = "all";
string lang = cfg.GetProperty("defaultLanguage").GetString()!;
string? outputDir = null;

for (int i = 0; i < args.Length; i++)
{
    if (args[i] == "--target" && i + 1 < args.Length) target = args[++i].ToLowerInvariant();
    if (args[i] == "--output" && i + 1 < args.Length) outputDir = args[++i];
    if (args[i] == "--lang" && i + 1 < args.Length) lang = args[++i].ToLowerInvariant();
}

if (!langs.TryGetProperty(lang, out var langCfg) || !providers.TryGetValue(lang, out var provider))
{
    Console.WriteLine($"Error: Unsupported language '{lang}'. Available: {string.Join(", ", providers.Keys)}");
    return 1;
}

string vsLang = langCfg.GetProperty("vsLanguage").GetString()!;
string filePattern = $"*.{prefix}.{lang}";

var snippets = new Dictionary<string, Snippet>(StringComparer.OrdinalIgnoreCase);

foreach (var file in Directory.EnumerateFiles(root, filePattern, SearchOption.AllDirectories))
{
    foreach (var s in provider.Extract(file, File.ReadAllText(file)))
    {
        snippets[s.Tag] = s;
    }
}

List<string> Resolve(string tag, HashSet<string>? seen = null)
{
    seen ??= new(StringComparer.OrdinalIgnoreCase);
    var list = new List<string>();
    if (!seen.Add(tag) || !snippets.TryGetValue(tag, out var item)) return list;

    foreach (var r in item.Requires.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries))
        list.AddRange(Resolve(r, seen));

    list.Add(tag);
    return list;
}

var resolvedSnippets = new List<ResolvedSnippet>(snippets.Count);

foreach (var (tag, item) in snippets)
{
    var chain = Resolve(tag);
    string body = string.Join("\r\n\r\n", chain.Select(t => snippets[t].Code));
    string clean = tag.Replace("-", "").Replace("_", "");
    string cleanUnderscore = tag.Replace("-", "_");

    var shortcuts = new List<string>
    {
        $"{prefix}{clean}",
        $"{prefix}_{cleanUnderscore}",
        tag
    };

    if (!string.IsNullOrWhiteSpace(item.DeclaredName))
    {
        shortcuts.Add(item.DeclaredName);
    }

    var uniqueShortcuts = shortcuts.Distinct(StringComparer.Ordinal).ToArray();
    resolvedSnippets.Add(new ResolvedSnippet(tag, uniqueShortcuts, item.Description, body));
}

var activeFormatters = target == "all"
    ? formatters
    : formatters.Where(f => f.EditorKey.Equals(target, StringComparison.OrdinalIgnoreCase)).ToArray();

if (activeFormatters.Length == 0)
{
    Console.WriteLine($"Error: Unknown target '{target}'. Available: all, {string.Join(", ", formatters.Select(f => f.EditorKey))}");
    return 1;
}

foreach (var formatter in activeFormatters)
{
    string outFile = outputDir != null
        ? Path.Combine(outputDir, formatter.GetFileName(vsLang))
        : formatter.GetDefaultFilePath(root, cfg, vsLang);

    Directory.CreateDirectory(Path.GetDirectoryName(outFile)!);
    string content = formatter.Format(resolvedSnippets, vsLang);
    File.WriteAllText(outFile, content, Encoding.UTF8);

    Console.WriteLine($"[{formatter.EditorKey.ToUpperInvariant()} ({vsLang})] Generated {resolvedSnippets.Count} snippets in {outFile}");
}

return 0;
