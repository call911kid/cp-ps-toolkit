using System;
using System.Numerics;

// @snippet rup1d
/// <summary>
/// A 1D range update structure providing O(1) range additions and O(N) reconstruction.
/// </summary>
public sealed class RangeUpdate<T> where T : INumber<T>
{
    private readonly T[] _diff;
    private readonly int _length;

    /// <summary>
    /// Gets the number of elements in the array.
    /// </summary>
    public int Length => _length;

    /// <summary>
    /// Initializes an empty RangeUpdate structure of the specified length with all zeros.
    /// </summary>
    public RangeUpdate(int length)
    {
        _length = length;
        _diff = new T[length + 1];
    }

    /// <summary>
    /// Initializes a RangeUpdate structure from an initial source sequence in O(N) time.
    /// </summary>
    public RangeUpdate(ReadOnlySpan<T> source) : this(source.Length)
    {
        if (source.IsEmpty) return;

        _diff[0] = source[0];
        for (int i = 1; i < source.Length; i++)
        {
            _diff[i] = source[i] - source[i - 1];
        }
    }

    /// <summary>
    /// Adds value to all elements in range [left, right] (0-based, inclusive) in O(1) time.
    /// </summary>
    public void Add(int left, int right, T value)
    {
        _diff[left] += value;
        _diff[right + 1] -= value;
    }

    /// <summary>
    /// Adds value to a single element at index (0-based) in O(1) time.
    /// </summary>
    public void Add(int index, T value) => Add(index, index, value);

    /// <summary>
    /// Reconstructs and returns the final array in O(N) time.
    /// </summary>
    public T[] Build()
    {
        T[] result = new T[_length];
        Build(result);
        return result;
    }

    /// <summary>
    /// Reconstructs the final array in-place into the provided destination buffer in O(N) time with zero allocations.
    /// </summary>
    public void Build(Span<T> destination)
    {
        T current = T.Zero;
        for (int i = 0; i < _length; i++)
        {
            current += _diff[i];
            destination[i] = current;
        }
    }
}
