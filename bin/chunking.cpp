// -*- compile-command: "g++ -std=c++11 -Wall chunking.cpp -o chunking" -*-

#include <iostream>
#include <string>
#include <sstream>
#include <vector>

using namespace std;
vector<string> labels {"w", "pos"};

const auto N = 5;
const auto K = 2;

void output(vector<vector<string> > vecs)
{
    int l = (int) vecs[0].size();
    for (auto c = 0; c < l; ++c) { // char
        cout << vecs[K][c];
        for (auto k = 0; k < K; ++k) { // w or pos
            for (auto n = 1; n <= N; ++n) { // n-gram
                for (auto i = max(-c, -N); i <= min(N, l - n - c); ++i) {
                    cout << "\t" << labels[k] << "[" << i << "]";
                    for (auto j = i + 1; j < i + n; ++j) {
                        cout << "|" << labels[k] << "[" << j << "]";
                    }
                    cout << "=" << vecs[k][c + i];
                    for (auto j = i + 1; j < i + n; ++j) {
                        cout << "|" << vecs[k][c + j];
                    }
                }
            }
        }

        if (c == 0) {
            cout << "\t__BOS__";
        } else if (c == l - 1) {
            cout << "\t__EOS__";
        }

        cout << endl;
    }
    cout << endl;
}

int main()
{
    vector<vector<string> > vecs(K + 1, vector<string>());

    for (string line; getline(cin, line);) {
        if (line.length() > 0) {
            stringstream sst(line);
            for (auto i = 0; i < K + 1; ++i) {
                string s;
                sst >> s;
                vecs[i].push_back(s);
            }
        } else {
            output(vecs);
            for (auto i = 0; i < K + 1; ++i) {
                vecs[i].clear();
            }
        }
    }

    return 0;
}
