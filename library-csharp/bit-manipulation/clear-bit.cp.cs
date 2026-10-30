using System.Numerics;

public static partial class BitManipulationToolkit
{
    // @snippet cbit
    /// <summary>
    /// Clears the bit at the given 0-based index to 0.
    /// </summary>
    public static T ClearBit<T>(T n, int index) where T : IBinaryInteger<T>
        => n & ~(T.One << index);
}
