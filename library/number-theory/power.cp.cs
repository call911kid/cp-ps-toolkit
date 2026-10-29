using System;
using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet pow
    /// <summary>
    /// Computes base raised to exp.
    /// </summary>
    public static T Power<T>(T @base, T exp) where T : IBinaryInteger<T>
    {
        if (exp < T.Zero)
            throw new ArgumentOutOfRangeException(nameof(exp), "Negative exponent not supported.");

        T result = T.One;
        T b = @base;

        while (exp > T.Zero)
        {
            if ((exp & T.One) == T.One)
                result *= b;

            b *= b;
            exp >>= 1;
        }

        return result;
    }
}
