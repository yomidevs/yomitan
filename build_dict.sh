#!/bin/sh

KANJIDIC=util/data/kanjidic
EDICT=util/data/edict
ENAMDICT=util/data/enamdict
DICT_DIR=ext/bg/data

util/compile.py --kanjidic $KANJIDIC --edict $EDICT --enamdict $ENAMDICT $DICT_DIR
