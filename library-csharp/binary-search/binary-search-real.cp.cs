using System;

public static partial class BinarySearchToolkit
{
    // @snippet bsreal
    /// <summary>
    /// Finds the real number in [lo, hi] where predicate(val) becomes true using fixed iterations.
    /// </summary>
    public static double BinarySearch(double lo, double hi, Func<double, bool> predicate, int iterations = 100)
    {
        for (int i = 0; i < iterations; i++)
        {
            double mid = lo + (hi - lo) / 2.0;

            if (predicate(mid))
                hi = mid;
            else
                lo = mid;
        }

        return (lo + hi) / 2.0;
    }
}