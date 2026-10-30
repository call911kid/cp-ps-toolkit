using namespace std;

// @snippet sbit
/// <summary>
/// Sets the bit at the given 0-based index to 1 (default), or to 0 if value is false.
/// </summary>
long long SetBit(long long n, int index, bool value = true)
{
    return value ? (n | (1LL << index)) : (n & ~(1LL << index));
}
