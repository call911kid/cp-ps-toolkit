using System;
using System.Numerics;

public static partial class NumberTheoryToolkit
{
    /// <summary>
    /// Computes the modular multiplicative inverse of a modulo mod.
    /// </summary>
    public static T ModInverse<T>(T a, T mod) where T : IBinaryInteger<T>
    {
        var (gcd, x, _) = ExtendedGcd(a, mod);
        if (gcd != T.One)
            throw new InvalidOperationException($"Modular inverse does not exist: {a} and {mod} are not coprime.");

        return (x % mod + mod) % mod;
    }
}
