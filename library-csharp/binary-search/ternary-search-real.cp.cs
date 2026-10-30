using System;

public static partial class BinarySearchToolkit
{
    // @snippet tsreal
    /// <summary>
    /// Finds the real number x in [lo, hi] that optimizes f according to the predicate.
    /// </summary>
    public static double TernarySearch(double lo, double hi, Func<double, double> f, Func<double, double, bool> predicate, int iterations = 100)
    {
        for (int i = 0; i < iterations; i++)
        {
            double m1 = lo + (hi - lo) / 3.0;
            double m2 = hi - (hi - lo) / 3.0;

            if (predicate(f(m1), f(m2)))
                hi = m2;
            else
                lo = m1;
        }

        return (lo + hi) / 2.0;
    }
}
