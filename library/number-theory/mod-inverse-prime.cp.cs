using System.Numerics;

public static partial class NumberTheoryToolkit
{
    // @snippet mip
    // @require mpow
    /// <summary>
    /// Computes the modular multiplicative inverse of a modulo a prime mod.
    /// </summary>
    public static T ModInversePrime<T>(T a, T mod) where T : IBinaryInteger<T>
        => ModPower(a, mod - (T.One + T.One), mod);
}
