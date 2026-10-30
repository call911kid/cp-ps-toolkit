#include <bit>

using namespace std;

// @snippet msbi
/// <summary>
/// Returns the 0-based index of the highest set bit, or -1 if n is 0.
/// </summary>
int GetHighestSetBitIndex(long long n)
{
    return n == 0 ? -1 : bit_width((unsigned long long)n) - 1;
}
