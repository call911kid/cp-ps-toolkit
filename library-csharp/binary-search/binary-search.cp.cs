using System;
using System.Numerics;

public static partial class BinarySearchToolkit
{
    
    // @snippet bs
    /// <summary>
    /// Finds the first value in [lo, hi] where predicate(val) is true, or hi + 1 if not found.
    /// </summary>
    public static T BinarySearch<T>(T lo, T hi, Func<T, bool> predicate) where T : IBinaryInteger<T>
    {
        while (lo <= hi)
        {
            T mid = lo + ((hi - lo) >> 1);

            if (predicate(mid))
                hi = mid - T.One;
            else
                lo = mid + T.One;
        }

        return lo;
    }
}