using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet isp
    /// <summary>
    /// Determines whether a number is prime.
    /// </summary>
    public static bool IsPrime<T>(T n) where T : IBinaryInteger<T>
    {
        T two = T.CreateChecked(2);
        T three = T.CreateChecked(3);

        if (n <= T.One) return false;
        if (n <= three) return true;
        if ((n % two) == T.Zero || (n % three) == T.Zero) return false;

        T step = T.CreateChecked(6);
        for (T i = T.CreateChecked(5); i * i <= n; i += step)
        {
            if ((n % i) == T.Zero || (n % (i + two)) == T.Zero)
                return false;
        }

        return true;
    }
}
