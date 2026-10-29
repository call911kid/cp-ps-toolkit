using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet phi
    /// <summary>
    /// Computes Euler's Totient, counting integers in [1, n] coprime to n.
    /// </summary>
    public static T EulerTotient<T>(T n) where T : IBinaryInteger<T>
    {
        T result = n;
        T two = T.CreateChecked(2);

        for (T p = two; p * p <= n; p += (p == two ? T.One : two))
        {
            if ((n % p) != T.Zero) continue;

            while ((n % p) == T.Zero)
                n /= p;

            result -= result / p;
        }

        if (n > T.One)
            result -= result / n;

        return result;
    }
}
