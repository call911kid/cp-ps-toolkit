#include <bit>

using namespace std;

// @snippet popc
/// <summary>
/// Counts the total number of set bits (popcount).
/// </summary>
int CountSetBits(long long n)
{
    return popcount((unsigned long long)n);
}
