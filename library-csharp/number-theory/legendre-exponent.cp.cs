using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet leg
    /// <summary>
    /// Computes the largest exponent k such that prime^k divides n!.
    /// </summary>
    public static T LegendreExponent<T>(T n, T prime) where T : IBinaryInteger<T>
    {
        T count = T.Zero;
        while (n > T.Zero)
        {
            count += n / prime;
            n /= prime;
        }

        return count;
    }
}
