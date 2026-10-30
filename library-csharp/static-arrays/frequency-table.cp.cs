using System;

// @snippet freq
/// <summary>
/// A fast array-backed frequency table with O(1) distinct tracking and sliding window support.
/// </summary>
public sealed class FrequencyTable
{
    private readonly int[] _counts;
    private readonly int _minVal;
    private int _distinctCount;
    private long _totalCount;

    /// <summary>
    /// Gets the number of distinct elements with non-zero count.
    /// </summary>
    public int DistinctCount => _distinctCount;

    /// <summary>
    /// Gets the total number of element occurrences tracked.
    /// </summary>
    public long TotalCount => _totalCount;

    /// <summary>
    /// Gets the minimum value supported by this table.
    /// </summary>
    public int MinValue => _minVal;

    /// <summary>
    /// Gets the maximum value supported by this table.
    /// </summary>
    public int MaxValue => _minVal + _counts.Length - 1;

    /// <summary>
    /// Gets a read-only span of all raw frequency counts from MinValue to MaxValue.
    /// </summary>
    public ReadOnlySpan<int> Counts => _counts;

    /// <summary>
    /// Gets the frequency count of the specified value in O(1) time.
    /// </summary>
    public int this[int val] => GetCount(val);

    /// <summary>
    /// Initializes an empty FrequencyTable for values in range [0, maxVal].
    /// </summary>
    public FrequencyTable(int maxVal) : this(0, maxVal) { }

    /// <summary>
    /// Initializes an empty FrequencyTable for values in range [minVal, maxVal].
    /// </summary>
    public FrequencyTable(int minVal, int maxVal)
    {
        _minVal = minVal;
        _counts = new int[maxVal - minVal + 1];
    }

    /// <summary>
    /// Initializes a FrequencyTable for all 256 ASCII characters and counts occurrences from text.
    /// </summary>
    public FrequencyTable(ReadOnlySpan<char> text) : this(0, 255)
    {
        Add(text);
    }

    /// <summary>
    /// Adds count occurrences of a value in O(1) time.
    /// </summary>
    public void Add(int val, int count = 1)
    {
        if (count <= 0) return;
        int idx = val - _minVal;
        if (_counts[idx] == 0) _distinctCount++;
        _counts[idx] += count;
        _totalCount += count;
    }

    /// <summary>
    /// Adds all characters from the provided span into the table in O(N) time.
    /// </summary>
    public void Add(ReadOnlySpan<char> text)
    {
        for (int i = 0; i < text.Length; i++)
        {
            Add(text[i]);
        }
    }

    /// <summary>
    /// Adds all integers from the provided span into the table in O(N) time.
    /// </summary>
    public void Add(ReadOnlySpan<int> values)
    {
        for (int i = 0; i < values.Length; i++)
        {
            Add(values[i]);
        }
    }

    /// <summary>
    /// Removes count occurrences of a value in O(1) time.
    /// </summary>
    public bool Remove(int val, int count = 1)
    {
        if (count <= 0) return false;
        int idx = val - _minVal;
        if ((uint)idx >= (uint)_counts.Length || _counts[idx] == 0) return false;

        int toRemove = Math.Min(_counts[idx], count);
        _counts[idx] -= toRemove;
        _totalCount -= toRemove;
        if (_counts[idx] == 0) _distinctCount--;
        return true;
    }

    /// <summary>
    /// Gets the frequency count of the specified value in O(1) time.
    /// </summary>
    public int GetCount(int val)
    {
        int idx = val - _minVal;
        return (uint)idx < (uint)_counts.Length ? _counts[idx] : 0;
    }

    /// <summary>
    /// Returns true if the value has a frequency count greater than zero.
    /// </summary>
    public bool Contains(int val) => GetCount(val) > 0;
}
