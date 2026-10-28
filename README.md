# cp-ps-toolkit

my personal toolkit for problem solving.

i used to write in c++ for 3 years. after switching to c#, i started this toolkit so i have my own fast templates and data structures created during contests or while solving problems, plus all the small tricks and mistakes that cost me a wrong answer or TLE before.

this repo also archives original problems that i authored as a problem setter. i've contributed 30+ problems across contests and marathons including ACPC, plus one currently in CodeChef's queue.

## tips & tricks

- binary search is to find an answer (a value, an index, or a window size). it doesn't need an array, it works on any range between two integers as long as the answer is monotonic.
- use `l + (r - l) / 2` instead of `(l + r) / 2` because `l + r` can overflow.
- prefix or suffix of non-negative numbers are monotonic, therefore we can look up an answer in them using binary search in `o(log(n))` instead of `o(n)`.

<details>
<summary align="center"><div align="center">show more...</div></summary>

- when building prefix or suffix sums in place, start from index 1 (or `n - 2` for suffix) to avoid double counting the boundary element.
- in a 2d grid, `i + j` gives the diagonal from top-right to bottom-left, and `i - j` gives top-left to bottom-right. add `(m - 1)` to `i - j` to avoid negative index. total diagonals is `2 * (n + m - 1)`.
- to sort descending without writing a custom comparator, multiply numbers by `-1` and sort with the default.
- english alphabet has only 26 letters, so you can track them as bits inside a single 32-bit integer.
- to loop over all set bits (1s) in an integer, do `n = n & (n - 1)` until `n` becomes 0.
- `(n & (n - 1)) == 0` determines if a number is a power of two.
- if you're dealing with a large set of numbers that needs to store only a flag for each index, consider using `bitset` it is 1 bit per index unlike boolean array 1 byte (8 bits) per index
- the sum of two distinct powers of two cannot result in a power of two.
- only the perfect square number has an odd number of divisors.
- counting pairs might overflow, always consider the correct data type.
- underflow is a rare exception, consider it during mathematical operations.
- if the dp answer can be negative, never use `-1` as a sign of an unvisited state.
- the answer of a dp state could be the index of a value, not necessarily the value itself (saves memory as well).
- in multi-testcase problems, use a `visited` array marked with the testcase id (`visited[state] == testId`) instead of reallocating or clearing the dp array every testcase.
- to compute `ceil(a / b)` using integers only without floating-point errors, use `(a + b - 1) / b`.
- in c# and c++, `%` can return negative numbers; use `((a % mod) + mod) % mod` to always get a positive remainder.
- when bit shifting 30 or more positions, use `1L << n` (or `1LL << n`), because `1 << 30` overflows a 32-bit int.
- never compare floats with `a == b`; use `Math.Abs(a - b) < 1e-9` to avoid precision issues.

</details>
