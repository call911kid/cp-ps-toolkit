using namespace std;

// @snippet rbit
/// <summary>
/// Reverses the lowest bitCount bits of n.
/// </summary>
long long ReverseBits(long long n, int bitCount)
{
    long long rev = 0;
    for (int i = 0; i < bitCount; ++i)
    {
        rev = (rev << 1) | ((n >> i) & 1LL);
    }
    return rev;
}
