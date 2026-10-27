using System.Numerics;

public static partial class BitManipulationToolkit
{
    /// <summary>
    /// Clears the lowest set bit (LSB) of n (n & (n - 1)).
    /// </summary>
    public static T ClearLowestSetBit<T>(T n) where T : IBinaryInteger<T>
        => n & (n - T.One);
}