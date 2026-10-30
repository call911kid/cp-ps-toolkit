using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet rsum
    /// <summary>
    /// Computes the sum of integers from x to y inclusive.
    /// </summary>
    public static T RangeSum<T>(T x, T y) where T : IBinaryInteger<T>
    {
        if (x > y)
            (x, y) = (y, x);

        T two = T.CreateChecked(2);
        T count = y - x + T.One;
        T sum = x + y;

        return (count % two == T.Zero)
            ? (count / two) * sum
            : count * (sum / two);
    }
}
