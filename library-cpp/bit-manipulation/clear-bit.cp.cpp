using namespace std;

// @snippet cbit
/// <summary>
/// Clears the bit at the given 0-based index to 0.
/// </summary>
long long ClearBit(long long n, int index)
{
    return n & ~(1LL << index);
}
