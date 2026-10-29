using System;

public static partial class NumberTheoryToolkit
{
    // @snippet siv
    /// <summary>
    /// Generates a boolean array of size n + 1 where isPrime[i] indicates if i is prime.
    /// </summary>
    public static bool[] SieveOfEratosthenes(int n)
    {
        if (n < 2) return new bool[Math.Max(n + 1, 0)];

        bool[] isPrime = new bool[n + 1];
        Array.Fill(isPrime, true, 2, n - 1);

        for (int i = 2; (long)i * i <= n; i++)
        {
            if (!isPrime[i]) continue;

            for (int j = i * i; j <= n; j += i)
                isPrime[j] = false;
        }

        return isPrime;
    }
}
