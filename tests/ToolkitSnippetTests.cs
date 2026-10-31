using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using Xunit;

namespace CpToolkit.Tests;

/// <summary>
/// Validates snippet uniqueness and compilation using root toolkit configuration.
/// </summary>
public class ToolkitSnippetTests
{
    /// <summary>
    /// Asserts that no two snippets share the same tag within any configured language.
    /// </summary>
    [Fact]
    public void SnippetTagsAreUnique()
    {
        string root = GetToolkitRoot();
        var (prefix, languages) = LoadToolkitConfig(root);
        var tags = new Dictionary<(string Lang, string Tag), string>();

        foreach (string lang in languages)
        {
            string pattern = $"*.{prefix}.{lang}";
            var files = Directory.GetFiles(root, pattern, SearchOption.AllDirectories);

            foreach (string file in files)
            {
                string[] lines = File.ReadAllLines(file);
                for (int i = 0; i < lines.Length; i++)
                {
                    string trimmed = lines[i].TrimStart();
                    if (!trimmed.StartsWith("// @snippet")) continue;

                    string[] parts = trimmed.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length < 3) continue;

                    string tag = parts[2];
                    string location = $"{Path.GetRelativePath(root, file)}:{i + 1}";
                    var key = (lang, tag.ToLowerInvariant());

                    Assert.True(
                        tags.TryAdd(key, location),
                        $"Duplicate {lang} snippet '{tag}' at {location} (already defined in {tags.GetValueOrDefault(key)})"
                    );
                }
            }
        }
    }

    /// <summary>
    /// Verifies that all C++ snippet files compile cleanly using g++ syntax checking.
    /// </summary>
    [Fact]
    public void AllCppFilesCompile()
    {
        string root = GetToolkitRoot();
        var (prefix, _) = LoadToolkitConfig(root);
        string pattern = $"*.{prefix}.cpp";
        var cppFiles = Directory.GetFiles(root, pattern, SearchOption.AllDirectories);

        foreach (string file in cppFiles)
        {
            var psi = new ProcessStartInfo("g++", $"-std=c++20 -fsyntax-only \"{file}\"")
            {
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false
            };

            using var process = Process.Start(psi);
            Assert.True(process != null, "Failed to launch g++ compiler.");

            string error = process.StandardError.ReadToEnd();
            process.WaitForExit();

            Assert.True(
                process.ExitCode == 0,
                $"C++ compilation failed in {Path.GetRelativePath(root, file)}:\n{error}"
            );
        }
    }

    /// <summary>
    /// Verifies that C# and PowerShell generators produce identical snippet output.
    /// </summary>
    [Theory]
    [InlineData("cs")]
    [InlineData("cpp")]
    public void GeneratorsProduceIdenticalSnippets(string lang)
    {
        string root = GetToolkitRoot();
        string temp = Path.Combine(Path.GetTempPath(), $"parity_{lang}_{Guid.NewGuid():N}");
        string csOut = Path.Combine(temp, "cs");
        string psOut = Path.Combine(temp, "ps");

        try
        {
            Process.Start("dotnet", $"run --project \"{root}/tools/generators/csharp\" -- --lang {lang} --output \"{csOut}\"")!.WaitForExit();
            string ps = OperatingSystem.IsWindows() ? "powershell" : "pwsh";
            Process.Start(ps, $"-File \"{root}/tools/generators/powershell/generate-snippets.ps1\" -Lang {lang} -OutputDir \"{psOut}\"")!.WaitForExit();

            var csDoc = JsonDocument.Parse(File.ReadAllText(Directory.GetFiles(csOut, "*.code-snippets")[0])).RootElement;
            var psDoc = JsonDocument.Parse(File.ReadAllText(Directory.GetFiles(psOut, "*.code-snippets")[0])).RootElement;

            var csKeys = csDoc.EnumerateObject().Select(p => p.Name).OrderBy(x => x);
            var psKeys = psDoc.EnumerateObject().Select(p => p.Name).OrderBy(x => x);
            Assert.Equal(csKeys, psKeys);

            foreach (var prop in csDoc.EnumerateObject())
            {
                var csBody = string.Join("\n", prop.Value.GetProperty("body").EnumerateArray());
                var psBody = string.Join("\n", psDoc.GetProperty(prop.Name).GetProperty("body").EnumerateArray());
                Assert.Equal(csBody.Replace("\r", ""), psBody.Replace("\r", ""));
            }
        }
        finally
        {
            if (Directory.Exists(temp)) Directory.Delete(temp, true);
        }
    }

    /// <summary>
    /// Loads the shortcut prefix and supported language extensions from root toolkit.config.json.
    /// </summary>
    private static (string Prefix, List<string> Languages) LoadToolkitConfig(string root)
    {
        string configPath = Path.Combine(root, "toolkit.config.json");
        if (!File.Exists(configPath))
        {
            throw new FileNotFoundException($"Configuration file not found: {configPath}");
        }

        using var doc = JsonDocument.Parse(File.ReadAllText(configPath));
        var rootElement = doc.RootElement;

        string prefix = rootElement.GetProperty("shortcutPrefix").GetString() ?? "cp";
        var languages = new List<string>();

        if (rootElement.TryGetProperty("languages", out var langsElement))
        {
            foreach (var prop in langsElement.EnumerateObject())
            {
                languages.Add(prop.Name.ToLowerInvariant());
            }
        }

        return (prefix, languages);
    }

    /// <summary>
    /// Resolves the absolute toolkit root directory from assembly metadata injected at build time.
    /// </summary>
    private static string GetToolkitRoot()
    {
        foreach (var attr in typeof(ToolkitSnippetTests).Assembly.GetCustomAttributes<AssemblyMetadataAttribute>())
        {
            if (attr.Key == "ToolkitRoot" && attr.Value != null)
            {
                return Path.GetFullPath(attr.Value);
            }
        }

        throw new InvalidOperationException("ToolkitRoot assembly metadata missing from build output.");
    }
}
