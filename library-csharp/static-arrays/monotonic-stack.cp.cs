using System;

public static partial class MonotonicStackToolkit
{
    // @snippet mstack
    /// <summary>
    /// Finds the index of the nearest element (next if next=true, previous if next=false) satisfying the predicate.
    /// </summary>
    public static int[] FindNearest<T>(ReadOnlySpan<T> source, Func<T, T, bool> shouldPop, bool next = true, int emptyValue = -1)
    {
        int n = source.Length;
        var result = new int[n];
        var stack = new int[n];
        int top = 0;

        for (int k = 0; k < n; k++)
        {
            int i = next ? n - 1 - k : k;
            T curr = source[i];

            while (top > 0 && shouldPop(source[stack[top - 1]], curr))
                top--;

            result[i] = top > 0 ? stack[top - 1] : emptyValue;
            stack[top++] = i;
        }

        return result;
    }
}
