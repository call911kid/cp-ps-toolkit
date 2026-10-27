#include <iostream>
#include <vector>
#include <string>

using namespace std;

// Desynchronizes C/C++ streams and unties cin for fast I/O
inline void FastIO()
{
    ios_base::sync_with_stdio(0);
    cin.tie(0);
}

// Redirects standard streams to local files for offline testing
inline void FileIO(const char* inputFile = "input.txt", const char* outputFile = "output.txt")
{
#ifndef ONLINE_JUDGE
    freopen(inputFile, "r", stdin);
    freopen(outputFile, "w", stdout);
#endif
}

template <typename T>
inline void Print(const T& val)
{
    cout << val;
}

inline void Println()
{
    cout << '\n';
}

template <typename T>
inline void Println(const T& val)
{
    cout << val << '\n';
}

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

template <typename T>
inline void Println(const vector<vector<T>>& matrix, const string& sep = " ")
{
    for (const auto& row : matrix)
    {
        Println(row, sep);
    }
}
