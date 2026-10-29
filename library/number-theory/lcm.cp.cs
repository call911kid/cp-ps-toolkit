using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet lcm
    // @require gcd
    /// <summary>
    /// Computes the least common multiple (LCM) of two integers.
    /// </summary>
    public static T Lcm<T>(T a, T b) where T : IBinaryInteger<T>
    {
        if (a == T.Zero || b == T.Zero) return T.Zero;
        return T.Abs((a / Gcd(a, b)) * b);
    }
}
