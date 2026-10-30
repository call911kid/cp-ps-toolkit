#include <string_view>

using namespace std;

// @snippet s2m
/// <summary>
/// Converts a string of lowercase English letters ('a'-'z') into a 26-bit integer mask.
/// </summary>
int StringToMask(string_view s)
{
    int mask = 0;
    for (char c : s)
    {
        mask |= (1 << (c - 'a'));
    }
    return mask;
}
