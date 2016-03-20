#!/bin/sh

KANJIDIC=util/data/kanjidic
EDICT=util/data/edict
ENAMDICT=util/data/enamdict
KRADFILE=util/data/kradfile
DICT_DIR=ext/jp/data

util/compile.py --kanjidic $KANJIDIC --kradfile $KRADFILE --edict $EDICT --enamdict $ENAMDICT $DICT_DIR
