using System;
using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet istp
    // @require isp
    /// <summary>
    /// Checks whether n has exactly 3 positive divisors.
    /// </summary>
    public static bool IsTPrime<T>(T n) where T : IBinaryInteger<T>
    {
        if (n < T.CreateChecked(4)) return false;

        double sqrtVal = Math.Round(Math.Sqrt(double.CreateChecked(n)));
        T root = T.CreateChecked(sqrtVal);

        return (root * root == n) && IsPrime(root);
    }
}
