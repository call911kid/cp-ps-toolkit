using System.Numerics;

public static partial class BitManipulationToolkit
{
    /// <summary>
    /// Checks whether n is a positive power of two (n > 0 and (n & (n - 1)) == 0).
    /// </summary>
    public static bool IsPowerOfTwo<T>(T n) where T : IBinaryInteger<T>
        => n > T.Zero && (n & (n - T.One)) == T.Zero;
}