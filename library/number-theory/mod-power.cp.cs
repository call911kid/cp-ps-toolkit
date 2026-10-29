using System;
using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet mpow
    /// <summary>
    /// Computes (base^exp) % mod.
    /// </summary>
    public static T ModPower<T>(T @base, T exp, T mod) where T : IBinaryInteger<T>
    {
        if (exp < T.Zero)
            throw new ArgumentOutOfRangeException(nameof(exp), "Negative exponent not supported.");
        if (mod <= T.Zero)
            throw new ArgumentOutOfRangeException(nameof(mod), "Modulus must be positive.");

        T result = T.One % mod;
        T b = (@base % mod + mod) % mod;

        while (exp > T.Zero)
        {
            if ((exp & T.One) == T.One)
                result = (result * b) % mod;

            b = (b * b) % mod;
            exp >>= 1;
        }

        return result;
    }
}
