using System.Numerics;

public static partial class BitManipulationToolkit
{
    /// <summary>
    /// Returns the 0-based index of the highest set bit, or -1 if n is 0.
    /// </summary>
    public static int GetHighestSetBitIndex<T>(T n) where T : IBinaryInteger<T>
        => n == T.Zero ? -1 : n.GetByteCount() * 8 - 1 - int.CreateTruncating(T.LeadingZeroCount(n));
}