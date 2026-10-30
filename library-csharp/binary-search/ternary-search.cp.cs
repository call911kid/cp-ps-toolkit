using System;

public static partial class BinarySearchToolkit
{
    // @snippet ts
    /// <summary>
    /// Finds the integer x in [lo, hi] that optimizes f according to the predicate.
    /// </summary>
    public static long TernarySearch(long lo, long hi, Func<long, long> f, Func<long, long, bool> predicate)
    {
        while (hi - lo > 2)
        {
            long m1 = lo + (hi - lo) / 3;
            long m2 = hi - (hi - lo) / 3;

            if (predicate(f(m1), f(m2)))
                hi = m2 - 1;
            else
                lo = m1 + 1;
        }

        long best = lo;
        for (long i = lo + 1; i <= hi; i++)
        {
            if (predicate(f(i), f(best)))
                best = i;
        }

        return best;
    }
}
