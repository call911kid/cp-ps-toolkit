using System.Collections.Generic;
using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet div
    /// <summary>
    /// Extracts all divisors of n in sorted order.
    /// </summary>
    public static List<T> GetDivisors<T>(T n) where T : IBinaryInteger<T>
    {
        List<T> small = new();
        List<T> large = new();

        for (T i = T.One; i * i <= n; i++)
        {
            if ((n % i) != T.Zero) continue;

            small.Add(i);
            T paired = n / i;
            if (paired != i)
                large.Add(paired);
        }

        large.Reverse();
        small.AddRange(large);
        return small;
    }
}
