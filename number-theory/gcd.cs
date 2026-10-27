using System.Numerics;

public static partial class NumberTheoryToolkit
{
    /// <summary>
    /// Computes the greatest common divisor (GCD) of two integers.
    /// </summary>
    public static T Gcd<T>(T a, T b) where T : IBinaryInteger<T>
        => b == T.Zero ? T.Abs(a) : Gcd(b, a % b);
}
