using System.Numerics;

public static partial class BitManipulationToolkit
{
    /// <summary>
    /// Inverts (flips) the bit at the given 0-based index.
    /// </summary>
    public static T ToggleBit<T>(T n, int index) where T : IBinaryInteger<T>
        => n ^ (T.One << index);
}