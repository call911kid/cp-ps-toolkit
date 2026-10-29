using System;
using System.Numerics;

// @snippet comb
// @require mip
/// <summary>
/// Precomputes factorials and inverse factorials for modular combinatorics queries under a prime modulus.
/// </summary>
public sealed class ModularCombinatorics<T> where T : IBinaryInteger<T>
{
    private readonly T[] _fact;
    private readonly T[] _invFact;
    private readonly T _mod;

    /// <summary>
    /// Initializes factorials and inverse factorials up to maxN.
    /// </summary>
    public ModularCombinatorics(int maxN, T mod)
    {
        _mod = mod;
        _fact = new T[maxN + 1];
        _invFact = new T[maxN + 1];

        _fact[0] = T.One;
        _invFact[0] = T.One;

        for (int i = 1; i <= maxN; i++)
        {
            _fact[i] = (_fact[i - 1] * T.CreateChecked(i)) % _mod;
        }

        _invFact[maxN] = NumberTheoryToolkit.ModInversePrime(_fact[maxN], _mod);

        for (int i = maxN - 1; i >= 1; i--)
        {
            _invFact[i] = (_invFact[i + 1] * T.CreateChecked(i + 1)) % _mod;
        }
    }

    /// <summary>
    /// Queries nCr % mod.
    /// </summary>
    public T NCr(int n, int r)
    {
        if (r < 0 || r > n) return T.Zero;
        return (_fact[n] * _invFact[r] % _mod) * _invFact[n - r] % _mod;
    }

    /// <summary>
    /// Queries nPr % mod.
    /// </summary>
    public T NPr(int n, int r)
    {
        if (r < 0 || r > n) return T.Zero;
        return _fact[n] * _invFact[n - r] % _mod;
    }
}
