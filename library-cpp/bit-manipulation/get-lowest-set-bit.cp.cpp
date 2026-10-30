using namespace std;

// @snippet lsb
/// <summary>
/// Isolates the lowest set bit (LSB) value via two's complement (n & -n).
/// </summary>
long long GetLowestSetBit(long long n)
{
    return n & -n;
}
