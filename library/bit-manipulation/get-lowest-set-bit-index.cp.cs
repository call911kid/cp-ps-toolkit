using System.Numerics;

public static partial class BitManipulationToolkit
{
    // @snippet lsbi
    /// <summary>
    /// Returns the 0-based index of the lowest set bit, or -1 if n is 0.
    /// </summary>
    public static int GetLowestSetBitIndex<T>(T n) where T : IBinaryInteger<T>
        => n == T.Zero ? -1 : int.CreateTruncating(T.TrailingZeroCount(n));
}
