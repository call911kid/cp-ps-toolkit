using System.Numerics;

public static partial class BitManipulationToolkit
{
    // @snippet lsb
    /// <summary>
    /// Isolates the lowest set bit (LSB) value via two's complement (n & -n).
    /// </summary>
    public static T GetLowestSetBit<T>(T n) where T : IBinaryInteger<T>
        => n & -n;
}
