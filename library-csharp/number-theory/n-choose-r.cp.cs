using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet ncr
    /// <summary>
    /// Computes nCr.
    /// </summary>
    public static T NCr<T>(T n, T r) where T : IBinaryInteger<T>
    {
        if (r < T.Zero || r > n) return T.Zero;
        if (r == T.Zero || r == n) return T.One;

        if (r > n - r)
            r = n - r;

        T result = T.One;
        for (T i = T.One; i <= r; i++)
        {
            result = (result * (n - r + i)) / i;
        }

        return result;
    }
}
