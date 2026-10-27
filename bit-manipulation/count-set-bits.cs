using System.Numerics;

public static partial class BitManipulationToolkit
{
    /// <summary>
    /// Counts the total number of set bits (popcount).
    /// </summary>
    public static int CountSetBits<T>(T n) where T : IBinaryInteger<T>
        => int.CreateTruncating(T.PopCount(n));
}