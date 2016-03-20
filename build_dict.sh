#!/bin/sh

KANJIDIC=util/data/kanjidic
EDICT=util/data/edict
ENAMDICT=util/data/enamdict
DICT=ext/jp/data/dict.json

[ -f $DICT ] && rm $DICT
util/compile.py --kanjidic $KANJIDIC --edict $EDICT $DICT --enamdict $ENAMDICT
