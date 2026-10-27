using System.Numerics;

public static partial class BitManipulationToolkit
{
    /// <summary>
    /// Checks if the bit at the given 0-based index is set to 1.
    /// </summary>
    public static bool IsBitSet<T>(T n, int index) where T : IBinaryInteger<T>
        => ((n >>> index) & T.One) == T.One;
}