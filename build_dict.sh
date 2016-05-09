#!/bin/sh

KANJIDIC=common/data/kanjidic
EDICT=common/data/edict
ENAMDICT=common/data/enamdict
DICT_DIR=ext/bg/data

common/compile.py --kanjidic $KANJIDIC --edict $EDICT --enamdict $ENAMDICT $DICT_DIR
