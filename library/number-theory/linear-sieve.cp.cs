using System.Collections.Generic;

public static partial class NumberTheoryToolkit
{
    // @snippet lsiv
    /// <summary>
    /// Computes all primes up to n and each number's Smallest Prime Factor (SPF).
    /// </summary>
    public static (int[] Primes, int[] Spf) LinearSieve(int n)
    {
        int[] spf = new int[n + 1];
        List<int> primes = new();

        for (int i = 2; i <= n; i++)
        {
            if (spf[i] == 0)
            {
                spf[i] = i;
                primes.Add(i);
            }

            for (int j = 0; j < primes.Count && primes[j] <= spf[i] && (long)i * primes[j] <= n; j++)
            {
                spf[i * primes[j]] = primes[j];
            }
        }

        return (primes.ToArray(), spf);
    }
}
