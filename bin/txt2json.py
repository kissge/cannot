#!/usr/bin/env python2

import codecs, json

import argparse
parser = argparse.ArgumentParser()
parser.add_argument("input", type=str, help="path to input text file (or /dev/stdin)")
parser.add_argument("output", type=str, help="path to output json file")

group = parser.add_mutually_exclusive_group()
group.add_argument("--no-labels", action="store_true", help="enable this if input file does not contain labels")
group.add_argument("-a", "--annotation", type=str, help="path to output json file (golden annotation data)")

parser.add_argument("-l", "--label", type=str, help="path to input json file (labels); if not specified, and if neither --no-labels specified, labels are automatically generated from input file")
parser.add_argument("-t", "--title", type=str, help="title of data")

parser.add_argument("--ensure-ascii", action="store_true", help="output json files contain only ascii characters")
args = parser.parse_args()

def item(nodes):
    shared_features = list(reduce(lambda x, y: x & y, [set(n['features']) for n in nodes]))
    nodes = [{'surface': n['surface'], 'features': [f for f in n['features'] if f not in shared_features]} for n in nodes]
    return {'shared_features': shared_features, 'nodes': nodes}

data = {
    'title': (args.title or 'Untitled').decode('utf-8'),
    'data': [], 'labels': []
}
annotation, nodes, annot = [], [], []
labels, features = set(), set()

if args.label:
    with codecs.open(args.label, 'r', 'utf-8') as fp:
        data['labels'] = json.load(fp)

with codecs.open(args.input, 'r', 'utf-8') as fp:
    for line in fp:
        line = line.strip()
        if line == '':
            data['data'].append(item(nodes))
            if args.annotation:
                annotation.append({'labels': annot, 'done': True, 'question': False})
            annot, nodes = [], []
        else:
            l = line.split()
            f = l[1:] if args.no_labels else l[1:-1]
            features |= set(f)
            nodes.append({'surface': l[0], 'features': f})
            if not args.no_labels:
                labels.add(l[-1])
                annot.append(l[-1])

if args.annotation:
    if not args.label:
        data['labels'] = [{'id': l, 'name': l, 'color': 'white'} for l in labels]
    with codecs.open(args.annotation, 'w', 'utf-8') as fp:
        print >> fp, json.dumps(annotation, ensure_ascii=args.ensure_ascii, indent=2)

data['feature_color'] = dict(zip(features, ['white'] * len(features)))

with codecs.open(args.output, 'w', 'utf-8') as fp:
    print >> fp, json.dumps(data, ensure_ascii=args.ensure_ascii, indent=2)
