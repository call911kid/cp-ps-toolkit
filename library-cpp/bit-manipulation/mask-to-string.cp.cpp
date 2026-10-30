#include <string>

using namespace std;

// @snippet m2s
/// <summary>
/// Reconstructs a sorted string of lowercase English letters from a 26-bit integer mask.
/// </summary>
string MaskToString(int mask)
{
    string result;
    result.reserve(26);
    for (int i = 0; i < 26; ++i)
    {
        if ((mask >> i) & 1)
        {
            result += static_cast<char>('a' + i);
        }
    }
    return result;
}
