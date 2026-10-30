using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet egcd
    /// <summary>
    /// Computes gcd(a, b) and Bézout coefficients x and y such that a*x + b*y = gcd(a, b).
    /// </summary>
    public static (T Gcd, T X, T Y) ExtendedGcd<T>(T a, T b) where T : IBinaryInteger<T>
    {
        if (b == T.Zero)
            return (T.Abs(a), a < T.Zero ? -T.One : T.One, T.Zero);

        var (g, x1, y1) = ExtendedGcd(b, a % b);
        return (g, y1, x1 - (a / b) * y1);
    }
}
