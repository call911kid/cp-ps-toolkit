using namespace std;

// @snippet tbit
/// <summary>
/// Inverts (flips) the bit at the given 0-based index.
/// </summary>
long long ToggleBit(long long n, int index)
{
    return n ^ (1LL << index);
}
