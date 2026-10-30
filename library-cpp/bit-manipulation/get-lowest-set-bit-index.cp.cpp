#include <bit>

using namespace std;

// @snippet lsbi
/// <summary>
/// Returns the 0-based index of the lowest set bit, or -1 if n is 0.
/// </summary>
int GetLowestSetBitIndex(long long n)
{
    return n == 0 ? -1 : countr_zero((unsigned long long)n);
}
