#include <bit>

using namespace std;

// @snippet parity
/// <summary>
/// Checks whether the count of set bits in n is odd.
/// </summary>
bool HasOddParity(long long n)
{
    return (popcount((unsigned long long)n) & 1) == 1;
}
