using System.Numerics;

public static partial class BitManipulationToolkit
{
    // @snippet rbit
    /// <summary>
    /// Reverses the lowest bitCount bits of n.
    /// </summary>
    public static T ReverseBits<T>(T n, int bitCount) where T : IBinaryInteger<T>
    {
        T rev = T.Zero;
        for (int i = 0; i < bitCount; i++)
        {
            rev = (rev << 1) | ((n >>> i) & T.One);
        }

        return rev;
    }
}
