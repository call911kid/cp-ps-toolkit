using System;

public static partial class BitManipulationToolkit
{
    // @snippet s2m
    /// <summary>
    /// Converts a string of lowercase English letters ('a'-'z') into a 26-bit integer mask.
    /// </summary>
    public static int StringToMask(ReadOnlySpan<char> s)
    {
        int mask = 0;
        foreach (char c in s)
        {
            mask |= 1 << (c - 'a');
        }

        return mask;
    }
}
