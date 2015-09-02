#!/usr/bin/env pypy

import sys, codecs, json, copy

DIV = 100

with codecs.open(sys.argv[1], 'r', 'utf-8') as fp:
    data = json.load(fp)

print '%s contains %d entries' % (sys.argv[1], len(data['data']))

i = 0
def subset(data, i, j):
    data = copy.deepcopy(data)
    data['data'] = data['data'][i:j]
    return data

orig = sys.argv[1][:-5] if sys.argv[1].endswith('.json') else sys.argv[1]

while i < len(data['data']):
    filename = orig + '.' + str(i).zfill(len(str(len(data['data'])))) + '.json'
    with codecs.open(filename, 'w', 'utf-8') as fp:
        print >> fp, json.dumps(subset(data, i, i + DIV), ensure_ascii=False, indent=2)
    print filename
    i += DIV
