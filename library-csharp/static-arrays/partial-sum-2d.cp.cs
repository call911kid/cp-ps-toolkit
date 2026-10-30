using System;
using System.Numerics;

// @snippet psum2d
/// <summary>
/// A 2D partial sum table providing O(1) subgrid, prefix, and suffix queries with zero branches.
/// </summary>
public sealed class PartialSum2D<T> where T : INumber<T>
{
    private readonly T[,] _pref;
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
    /// Gets the total sum of all elements in the grid.
    /// </summary>
    public T TotalSum => _pref[_rows, _cols];

    /// <summary>
    /// Builds the 1-based 2D partial sum table from the source grid in O(R x C) time.
    /// </summary>
    public PartialSum2D(T[,] source)
    {
        _rows = source.GetLength(0);
        _cols = source.GetLength(1);
        _pref = new T[_rows + 1, _cols + 1];

        for (int i = 0; i < _rows; i++)
        {
            for (int j = 0; j < _cols; j++)
            {
                _pref[i + 1, j + 1] = source[i, j]
                    + _pref[i, j + 1]
                    + _pref[i + 1, j]
                    - _pref[i, j];
            }
        }
    }

    /// <summary>
    /// Queries the sum of the subgrid from (r1, c1) to (r2, c2) (0-based, inclusive) in O(1) time.
    /// </summary>
    public T Query(int r1, int c1, int r2, int c2)
        => _pref[r2 + 1, c2 + 1] - _pref[r1, c2 + 1] - _pref[r2 + 1, c1] + _pref[r1, c1];

    /// <summary>
    /// Queries the prefix sum of the subgrid from (0, 0) to (r, c) (0-based, inclusive) in O(1) time.
    /// </summary>
    public T Prefix(int r, int c)
        => _pref[r + 1, c + 1];

    /// <summary>
    /// Queries the suffix sum of the subgrid from (r, c) to the bottom-right corner in O(1) time.
    /// </summary>
    public T Suffix(int r, int c)
        => Query(r, c, _rows - 1, _cols - 1);

    /// <summary>
    /// Indexer shortcut to query the subgrid sum from (r1, c1) to (r2, c2) (0-based, inclusive).
    /// </summary>
    public T this[int r1, int c1, int r2, int c2] => Query(r1, c1, r2, c2);
}
