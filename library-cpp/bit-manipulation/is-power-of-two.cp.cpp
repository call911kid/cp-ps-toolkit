#include <bit>

using namespace std;

// @snippet isp2
/// <summary>
/// Checks whether n is a positive power of two (n > 0 and (n & (n - 1)) == 0).
/// </summary>
bool IsPowerOfTwo(long long n)
{
    return n > 0 && has_single_bit((unsigned long long)n);
}
