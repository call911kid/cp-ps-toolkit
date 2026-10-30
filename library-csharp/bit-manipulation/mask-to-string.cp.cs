using System;

public static partial class BitManipulationToolkit
{
    // @snippet m2s
    /// <summary>
    /// Reconstructs a sorted string of lowercase English letters from a 26-bit integer mask.
    /// </summary>
    public static string MaskToString(int mask)
    {
        Span<char> buffer = stackalloc char[26];
        int len = 0;
        for (int i = 0; i < 26; i++)
        {
            if (((mask >> i) & 1) == 1)
            {
                buffer[len++] = (char)('a' + i);
            }
        }

        return new string(buffer[..len]);
    }
}
