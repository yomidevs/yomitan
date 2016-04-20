#!/usr/bin/env python

# Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
# Author: Alex Yatskov <alex@foosoft.net>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.


import codecs
import json
import optparse
import os.path
import re


PARSED_TAGS = {
    'Buddh':   'Buddhist term',
    'MA':      'martial arts term',
    'X':       'rude or X-rated term',
    'abbr':    'abbreviation',
    'adj':     'former adjective classification (being removed)',
    'adj-f':   'noun or verb acting prenominally (other than the above)',
    'adj-i':   'adjective (keiyoushi)',
    'adj-na':  'adjectival nouns or quasi-adjectives (keiyodoshi)',
    'adj-no':  'nouns which may take the genitive case particle "no"',
    'adj-pn':  'pre-noun adjectival (rentaishi)',
    'adj-t':   '"taru" adjective',
    'adv':     'adverb (fukushi)',
    'adv-n':   'adverbial noun',
    'adv-to':  'adverb taking the "to" particle',
    'arch':    'archaism',
    'ateji':   'ateji (phonetic) reading',
    'aux':     'auxiliary',
    'aux-adj': 'auxiliary adjective',
    'aux-v':   'auxiliary verb',
    'c':       'company name',
    'chn':     'children\'s language',
    'col':     'colloquialism',
    'comp':    'computer terminology',
    'conj':    'conjunction',
    'ctr':     'counter',
    'derog':   'derogatory term',
    'eK':      'exclusively kanji',
    'ek':      'exclusively kana',
    'exp':     'Expressions (phrases, clauses, etc.)',
    'f':       'female given name',
    'fam':     'familiar language',
    'fem':     'female term or language',
    'food':    'food term',
    'g':       'given name, as-yet not classified by sex',
    'geom':    'geometry term',
    'gikun':   'gikun (meaning) reading',
    'gram':    'grammatical term',
    'h':       'full (usually family plus given) name of a particular person',
    'hon':     'honorific or respectful (sonkeigo) language',
    'hum':     'humble (kenjougo) language',
    'iK':      'word containing irregular kanji usage',
    'id':      'idiomatic expression',
    'ik':      'word containing irregular kana usage',
    'int':     'interjection (kandoushi)',
    'io':      'irregular okurigana usage',
    'iv':      'irregular verb',
    'ling':    'linguistics terminology',
    'm':       'male given name',
    'm-sl':    'manga slang',
    'male':    'male term or language',
    'male-sl': 'male slang',
    'math':    'mathematics',
    'mil':     'military',
    'n':       'noun (common) (futsuumeishi)',
    'n-adv':   'adverbial noun (fukushitekimeishi)',
    'n-pref':  'noun, used as a prefix',
    'n-suf':   'noun, used as a suffix',
    'n-t':     'noun (temporal) (jisoumeishi)',
    'num':     'numeric',
    'oK':      'word containing out-dated kanji',
    'obs':     'obsolete term',
    'obsc':    'obscure term',
    'ok':      'out-dated or obsolete kana usage',
    'on-mim':  'onomatopoeic or mimetic word',
    'P':       'popular term',
    'p':       'place-name',
    'physics': 'physics terminology',
    'pn':      'pronoun',
    'poet':    'poetical term',
    'pol':     'polite (teineigo) language',
    'pr':      'product name',
    'pref':    'prefix',
    'prt':     'particle',
    'rare':    'rare (now replaced by "obsc")',
    's':       'surname',
    'sens':    'sensitive word',
    'sl':      'slang',
    'st':      'stations',
    'suf':     'suffix',
    'u':       'person name, either given or surname, as-yet unclassified',
    'uK':      'word usually written using kanji alone',
    'uk':      'word usually written using kana alone',
    'v1':      'Ichidan verb',
    'v2a-s':   'Nidan verb with "u" ending (archaic)',
    'v4h':     'Yodan verb with "hu/fu" ending (archaic)',
    'v4r':     'Yodan verb with "ru" ending (archaic)',
    'v5':      'Godan verb (not completely classified)',
    'v5aru':   'Godan verb - -aru special class',
    'v5b':     'Godan verb with "bu" ending',
    'v5g':     'Godan verb with "gu" ending',
    'v5k':     'Godan verb with "ku" ending',
    'v5k-s':   'Godan verb - iku/yuku special class',
    'v5m':     'Godan verb with "mu" ending',
    'v5n':     'Godan verb with "nu" ending',
    'v5r':     'Godan verb with "ru" ending',
    'v5r-i':   'Godan verb with "ru" ending (irregular verb)',
    'v5s':     'Godan verb with "su" ending',
    'v5t':     'Godan verb with "tsu" ending',
    'v5u':     'Godan verb with "u" ending',
    'v5u-s':   'Godan verb with "u" ending (special class)',
    'v5uru':   'Godan verb - uru old class verb (old form of Eru)',
    'v5z':     'Godan verb with "zu" ending',
    'vi':      'intransitive verb',
    'vk':      'kuru verb - special class',
    'vn':      'irregular nu verb',
    'vs':      'noun or participle which takes the aux. verb suru',
    'vs-c':    'su verb - precursor to the modern suru',
    'vs-i':    'suru verb - irregular',
    'vs-s':    'suru verb - special class',
    'vt':      'transitive ver',
    'vulg':    'vulgar expression or word',
    'vz':      'Ichidan verb - zuru verb - (alternative form of -jiru verbs)',
}


def is_hiragana(c):
    return 0x3040 <= ord(c) < 0x30a0


def is_katakana(c):
    return 0x30a0 <= ord(c) < 0x3100


def load_definitions(path):
    print('Parsing "{0}"...'.format(path))
    with codecs.open(path, encoding='euc-jp') as fp:
        return filter(lambda x: x and x[0] != '#', fp.read().splitlines())


def parse_kanji_dic(path):
    results = {}
    for line in load_definitions(path):
        segments = line.split()
        character = segments[0]
        kunyomi = ' '.join(filter(lambda x: list(filter(is_hiragana, x)), segments[1:]))
        onyomi = ' '.join(filter(lambda x: list(filter(is_katakana, x)), segments[1:]))
        glossary = '; '.join(re.findall('\{([^\}]+)\}', line))
        results[character] = (kunyomi or None, onyomi or None, glossary)

    return results


def parse_edict(path):
    results = []
    for line in load_definitions(path):
        segments = line.split('/')

        exp_parts = segments[0].split(' ')
        expression = exp_parts[0]
        reading_match = re.search('\[([^\]]+)\]', exp_parts[1])
        reading = None if reading_match is None else reading_match.group(1)

        defs = []
        tags = set()

        for index, dfn in enumerate(filter(None, segments[1:])):
            dfn_match = re.search(r'^((?:\((?:[\w\-\,\:]*)*\)\s*)*)(.*)$', dfn)

            tags_raw = set(filter(None, re.split(r'[\s\(\),]', dfn_match.group(1))))
            tags_raw = tags_raw.intersection(set(PARSED_TAGS.keys()))
            tags = tags.union(tags_raw)

            gloss = dfn_match.group(2).strip()
            if len(gloss) == 0:
                continue

            if index == 0 or len(dfn_match.group(1)) > 0:
                defs.append([gloss])
            else:
                defs[-1].append(gloss)

        result = [expression, reading, ' '.join(tags)]
        result += map(lambda x: '; '.join(x), defs)

        results.append(result)

    indices = {}
    for i, d in enumerate(results):
        for key in d[:2]:
            if key is not None:
                values = indices.get(key, [])
                values.append(i)
                indices[key] = values

    return {'defs': results, 'indices': indices}


def build_dict(output_dir, input_file, parser):
    if input_file is not None:
        base = os.path.splitext(os.path.basename(input_file))[0]
        with open(os.path.join(output_dir, base) + '.json', 'w') as fp:
             # json.dump(parser(input_file), fp, sort_keys=True, indent=4, separators=(',', ': '))
             json.dump(parser(input_file), fp, separators=(',', ':'))


def build(dict_dir, kanjidic, edict, enamdict):
    build_dict(dict_dir, kanjidic, parse_kanji_dic)
    build_dict(dict_dir, edict, parse_edict)
    build_dict(dict_dir, enamdict, parse_edict)


def main():
    parser = optparse.OptionParser()
    parser.add_option('--kanjidic', dest='kanjidic')
    parser.add_option('--edict', dest='edict')
    parser.add_option('--enamdict', dest='enamdict')

    options, args = parser.parse_args()

    if len(args) == 0:
        parser.print_help()
    else:
        build(args[0], options.kanjidic, options.edict, options.enamdict)


if __name__ == '__main__':
    main()
