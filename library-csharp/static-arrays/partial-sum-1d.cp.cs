using System;
using System.Numerics;

// @snippet psum
/// <summary>
/// A 1D partial sum array providing O(1) range, prefix, and suffix queries with zero branches.
/// </summary>
public sealed class PartialSum<T> where T : INumber<T>
{
    private readonly T[] _pref;

    /// <summary>
    /// Gets the number of elements in the original sequence.
    /// </summary>
    public int Length => _pref.Length - 1;

    /// <summary>
    /// Gets the total sum of all elements in the sequence.
    /// </summary>
    public T TotalSum => _pref[^1];

    /// <summary>
    /// Builds the 1-based partial sum array from the source sequence in O(N) time.
    /// </summary>
    public PartialSum(ReadOnlySpan<T> source)
    {
        _pref = new T[source.Length + 1];
        _pref[0] = T.Zero;
        for (int i = 0; i < source.Length; i++)
        {
            _pref[i + 1] = _pref[i] + source[i];
        }
    }

    /// <summary>
    /// Queries the sum of elements in range [left, right] (0-based, inclusive) in O(1) time.
    /// </summary>
    public T Query(int left, int right)
        => _pref[right + 1] - _pref[left];

    /// <summary>
    /// Queries the prefix sum from index 0 to right (0-based, inclusive) in O(1) time.
    /// </summary>
    public T Prefix(int right)
        => _pref[right + 1];

    /// <summary>
    /// Queries the suffix sum from index left to the end of the sequence in O(1) time.
    /// </summary>
    public T Suffix(int left)
        => _pref[^1] - _pref[left];

    /// <summary>
    /// Indexer shortcut to query the range sum [left, right] (0-based, inclusive).
    /// </summary>
    public T this[int left, int right] => Query(left, right);
    
}
