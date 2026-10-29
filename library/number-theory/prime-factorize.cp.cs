using System.Collections.Generic;
using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet pf
    /// <summary>
    /// Computes prime factors of n along with their exponent counts.
    /// </summary>
    public static List<(T Prime, int Exponent)> PrimeFactorize<T>(T n) where T : IBinaryInteger<T>
    {
        List<(T Prime, int Exponent)> factors = new();
        T two = T.CreateChecked(2);

        for (T d = two; d * d <= n; d += (d == two ? T.One : two))
        {
            if ((n % d) != T.Zero) continue;

            int count = 0;
            while ((n % d) == T.Zero)
            {
                count++;
                n /= d;
            }

            factors.Add((d, count));
        }

        if (n > T.One)
            factors.Add((n, 1));

        return factors;
    }
}
