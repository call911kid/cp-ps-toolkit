using System.Numerics;

public static partial class BitManipulationToolkit
{
    // @snippet sbit
    /// <summary>
    /// Sets the bit at the given 0-based index to 1 (default), or to 0 if value is false.
    /// </summary>
    public static T SetBit<T>(T n, int index, bool value = true) where T : IBinaryInteger<T>
        => value ? n | (T.One << index) : n & ~(T.One << index);
}
