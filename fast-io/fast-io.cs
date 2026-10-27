using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;

/// <summary>
/// Lightweight fast I/O helper using built-in StreamReader and token queuing.
/// </summary>
public static class IO
{
    private static StreamReader _reader = new(Console.OpenStandardInput(), bufferSize: 65536);
    private static StreamWriter _writer = new(Console.OpenStandardOutput(), bufferSize: 65536);
    private static readonly Queue<string> _tokens = new();

    /// <summary>
    /// Redirects standard input and output streams to local files for offline testing.
    /// </summary>
    public static void SetFileIO(string inputPath = "input.txt", string outputPath = "output.txt")
    {
        if (File.Exists(inputPath))
            _reader = new StreamReader(new FileStream(inputPath, FileMode.Open, FileAccess.Read), bufferSize: 65536);
        if (!string.IsNullOrEmpty(outputPath))
            _writer = new StreamWriter(new FileStream(outputPath, FileMode.Create, FileAccess.Write), bufferSize: 65536);
    }

    /// <summary>
    /// Reads the next whitespace-separated token string.
    /// </summary>
    public static string Next()
    {
        while (_tokens.Count == 0)
        {
            string line = _reader.ReadLine();
            if (line == null) return null;
            foreach (var t in line.Split((char[])null, StringSplitOptions.RemoveEmptyEntries))
                _tokens.Enqueue(t);
        }
        return _tokens.Dequeue();
    }

    /// <summary>
    /// Reads the next signed 32-bit integer.
    /// </summary>
    public static int NextInt() => int.Parse(Next());

    /// <summary>
    /// Reads the next signed 64-bit integer.
    /// </summary>
    public static long NextLong() => long.Parse(Next());

    /// <summary>
    /// Reads the next 64-bit floating point number.
    /// </summary>
    public static double NextDouble() => double.Parse(Next(), CultureInfo.InvariantCulture);

    /// <summary>
    /// Clears any queued tokens and reads the rest of the current line.
    /// </summary>
    public static string NextLine()
    {
        _tokens.Clear();
        return _reader.ReadLine();
    }

    /// <summary>
    /// Prints a single value without a trailing newline.
    /// </summary>
    public static void Print<T>(T val) => _writer.Write(val);

    /// <summary>
    /// Prints an empty newline.
    /// </summary>
    public static void Println() => _writer.WriteLine();

    /// <summary>
    /// Prints a single value followed by a newline.
    /// </summary>
    public static void Println<T>(T val) => _writer.WriteLine(val);

    /// <summary>
    /// Prints elements of a collection separated by a delimiter without a trailing newline.
    /// </summary>
    public static void Print<T>(IEnumerable<T> col, string sep = " ") =>
        _writer.Write(string.Join(sep, col));

    /// <summary>
    /// Prints elements of a collection separated by a delimiter followed by a newline.
    /// </summary>
    public static void Println<T>(IEnumerable<T> col, string sep = " ") =>
        _writer.WriteLine(string.Join(sep, col));

    /// <summary>
    /// Flushes buffered output to the underlying stream.
    /// </summary>
    public static void Flush() => _writer.Flush();
}
