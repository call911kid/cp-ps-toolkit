using namespace std;

// @snippet clsb
/// <summary>
/// Clears the lowest set bit (LSB) of n (n & (n - 1)).
/// </summary>
long long ClearLowestSetBit(long long n)
{
    return n & (n - 1LL);
}
