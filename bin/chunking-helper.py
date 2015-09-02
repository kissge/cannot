#!/usr/bin/env python2

import sys

W = 'w'
N = 5 if len(sys.argv) < 2 else int(sys.argv[1])

def ngram(n):
    for i in xrange(-N, N - n + 2):
        print '(' + ''.join(["('" + W + "', " + str(i + j) + "), " for j in xrange(n)]) + '),'

print 'templates = ('
for i in xrange(1, N + 1):
    print '#', i
    ngram(i)
print ')'
