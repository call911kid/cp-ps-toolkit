using namespace std;

// @snippet isbit
/// <summary>
/// Checks if the bit at the given 0-based index is set to 1.
/// </summary>
bool IsBitSet(long long n, int index)
{
    return ((n >> index) & 1LL) == 1LL;
}
