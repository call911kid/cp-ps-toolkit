#include <bit>

using namespace std;

// @snippet nextp
/// <summary>
/// Returns the lexicographically next integer with the same number of set bits in O(1).
/// </summary>
long long NextPermutation(long long mask)
{
    unsigned long long umask = mask;
    unsigned long long c = umask & -umask;
    unsigned long long r = umask + c;
    return (((r ^ umask) >> (countr_zero(c) + 2)) | r);
}
