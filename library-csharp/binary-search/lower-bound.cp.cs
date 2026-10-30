using System.Collections.Generic;

public static partial class BinarySearchToolkit
{
    // @snippet lb
    /// <summary>
    /// Finds the first index in [lo, hi] where source[i] >= target according to the comparer, or hi + 1 if not found.
    /// </summary>
    public static int LowerBound<T>(IReadOnlyList<T> source, int lo, int hi, T target, IComparer<T> comparer)
    {
        while (lo <= hi)
        {
            int mid = lo + ((hi - lo) >> 1);

            if (comparer.Compare(source[mid], target) >= 0)
                hi = mid - 1;
            else
                lo = mid + 1;
        }

        return lo;
    }
}
