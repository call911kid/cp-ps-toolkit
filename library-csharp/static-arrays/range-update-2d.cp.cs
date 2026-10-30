using System;
using System.Numerics;

// @snippet rup2d
/// <summary>
/// A 2D range update structure providing O(1) submatrix additions and O(R x C) reconstruction.
/// </summary>
public sealed class RangeUpdate2D<T> where T : INumber<T>
{
    private readonly T[,] _diff;
    private readonly int _rows;
    private readonly int _cols;

    /// <summary>
    /// Gets the number of rows in the grid.
    /// </summary>
    public int Rows => _rows;

    /// <summary>
    /// Gets the number of columns in the grid.
    /// </summary>
    public int Cols => _cols;

    /// <summary>
    /// Initializes an empty 2D range update grid of size rows x cols with all zeros.
    /// </summary>
    public RangeUpdate2D(int rows, int cols)
    {
        _rows = rows;
        _cols = cols;
        _diff = new T[rows + 1, cols + 1];
    }

    /// <summary>
    /// Initializes a 2D range update grid from an initial source grid in O(R x C) time.
    /// </summary>
    public RangeUpdate2D(T[,] source) : this(source.GetLength(0), source.GetLength(1))
    {
        for (int i = 0; i < _rows; i++)
        {
            for (int j = 0; j < _cols; j++)
            {
                T top = i > 0 ? source[i - 1, j] : T.Zero;
                T left = j > 0 ? source[i, j - 1] : T.Zero;
                T diag = (i > 0 && j > 0) ? source[i - 1, j - 1] : T.Zero;
                _diff[i, j] = source[i, j] - top - left + diag;
            }
        }
    }

    /// <summary>
    /// Adds value to all elements in subgrid [(r1, c1) to (r2, c2)] (0-based, inclusive) in O(1) time.
    /// </summary>
    public void Add(int r1, int c1, int r2, int c2, T value)
    {
        _diff[r1, c1] += value;
        _diff[r1, c2 + 1] -= value;
        _diff[r2 + 1, c1] -= value;
        _diff[r2 + 1, c2 + 1] += value;
    }

    /// <summary>
    /// Reconstructs and returns the final 2D grid in O(R x C) time.
    /// </summary>
    public T[,] Build()
    {
        T[,] result = new T[_rows, _cols];
        Build(result);
        return result;
    }

    /// <summary>
    /// Reconstructs the final 2D grid in-place into the destination grid in O(R x C) time with zero allocations.
    /// </summary>
    public void Build(T[,] destination)
    {
        for (int i = 0; i < _rows; i++)
        {
            for (int j = 0; j < _cols; j++)
            {
                T top = i > 0 ? destination[i - 1, j] : T.Zero;
                T left = j > 0 ? destination[i, j - 1] : T.Zero;
                T diag = (i > 0 && j > 0) ? destination[i - 1, j - 1] : T.Zero;
                destination[i, j] = _diff[i, j] + top + left - diag;
            }
        }
    }
}
