using System.Numerics;

public static partial class BitManipulationToolkit
{
    // @snippet parity
    /// <summary>
    /// Checks whether the count of set bits in n is odd.
    /// </summary>
    public static bool HasOddParity<T>(T n) where T : IBinaryInteger<T>
        => (int.CreateTruncating(T.PopCount(n)) & 1) == 1;
}
