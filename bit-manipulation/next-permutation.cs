using System.Numerics;

public static partial class BitManipulationToolkit
{
    /// <summary>
    /// Returns the lexicographically next integer with the same number of set bits in O(1).
    /// </summary>
    public static T NextPermutation<T>(T mask) where T : IBinaryInteger<T>
    {
        T c = mask & -mask;
        T r = mask + c;
        return (((r ^ mask) >>> (int.CreateTruncating(T.TrailingZeroCount(c)) + 2))) | r;
    }
}
