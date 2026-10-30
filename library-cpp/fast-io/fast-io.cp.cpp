#include <iostream>
#include <vector>
#include <string>

using namespace std;

// @snippet fastio
/// <summary>
/// Desynchronizes C/C++ standard streams and unties cin for fast I/O.
/// </summary>
inline void FastIO()
{
    ios_base::sync_with_stdio(0);
    cin.tie(0);
}

// @snippet fileio
/// <summary>
/// Redirects standard streams to local files for offline testing.
/// </summary>
inline void FileIO(const char* inputFile = "input.txt", const char* outputFile = "output.txt")
{
#ifndef ONLINE_JUDGE
    freopen(inputFile, "r", stdin);
    freopen(outputFile, "w", stdout);
#endif
}

// @snippet println
/// <summary>
/// Shorthand macro to print a value followed by a newline.
/// </summary>
#define println(x) cout << (x) << '\n'

// @snippet print
/// <summary>
/// Shorthand macro to print a value followed by a space.
/// </summary>
#define print(x) cout << (x) << ' '

// @snippet printv
/// <summary>
/// Prints elements of a vector separated by a delimiter followed by a newline.
/// </summary>
template <typename T>
inline void Println(const vector<T>& vec, const string& sep = " ")
{
    for (size_t i = 0; i < vec.size(); ++i)
    {
        if (i > 0) cout << sep;
        cout << vec[i];
    }
    cout << '\n';
}

// @snippet printm
/// <summary>
/// Prints a 2D matrix row by row followed by newlines.
/// </summary>
template <typename T>
inline void PrintMatrix(const vector<vector<T>>& matrix, const string& sep = " ")
{
    for (const auto& row : matrix)
    {
        for (size_t i = 0; i < row.size(); ++i)
        {
            if (i > 0) cout << sep;
            cout << row[i];
        }
        cout << '\n';
    }
}
