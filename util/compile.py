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
    'P',       # common word
    'adj',     # former adjective classification (being removed)
    'adj-f',   # noun or verb acting prenominally (other than the above)
    'adj-i',   # adjective (keiyoushi)
    'adj-na',  # adjectival nouns or quasi-adjectives (keiyodoshi)
    'adj-no',  # nouns which may take the genitive case particle `no'
    'adj-pn',  # pre-noun adjectival (rentaishi)
    'adj-t',   # `taru' adjective
    'adv',     # adverb (fukushi)
    'adv-n',   # adverbial noun
    'adv-to',  # adverb taking the `to' particle
    'aux',     # auxiliary
    'aux-adj', # auxiliary adjective
    'aux-v',   # auxiliary verb
    'c',       # company name
    'conj',    # conjunction
    'ctr',     # counter
    'exp',     # Expressions (phrases, clauses, etc.)
    'f',       # female given name
    'g',       # given name, as-yet not classified by sex
    'h',       # full (usually family plus given) name of a particular person
    'int',     # interjection (kandoushi)
    'iv',      # irregular verb
    'm',       # male given name
    'n',       # noun (common) (futsuumeishi)
    'n-adv',   # adverbial noun (fukushitekimeishi)
    'n-pref',  # noun, used as a prefix
    'n-suf',   # noun, used as a suffix
    'n-t',     # noun (temporal) (jisoumeishi)
    'num',     # numeric
    'p',       # place-name
    'pn',      # pronoun
    'pr',      # product name
    'pref' ,   # prefix
    'prt',     # particle
    's',       # surname
    'st',      # stations
    'suf',     # suffix
    'u',       # person name, either given or surname, as-yet unclassified
    'v1',      # Ichidan verb
    'v2a-s',   # Nidan verb with 'u' ending (archaic)
    'v4h',     # Yodan verb with `hu/fu' ending (archaic)
    'v4r',     # Yodan verb with `ru' ending (archaic)
    'v5',      # Godan verb (not completely classified)
    'v5aru',   # Godan verb - -aru special class
    'v5b',     # Godan verb with `bu' ending
    'v5g',     # Godan verb with `gu' ending
    'v5k',     # Godan verb with `ku' ending
    'v5k-s',   # Godan verb - iku/yuku special class
    'v5m',     # Godan verb with `mu' ending
    'v5n',     # Godan verb with `nu' ending
    'v5r',     # Godan verb with `ru' ending
    'v5r-i',   # Godan verb with `ru' ending (irregular verb)
    'v5s',     # Godan verb with `su' ending
    'v5t',     # Godan verb with `tsu' ending
    'v5u',     # Godan verb with `u' ending
    'v5u-s',   # Godan verb with `u' ending (special class)
    'v5uru',   # Godan verb - uru old class verb (old form of Eru)
    'v5z',     # Godan verb with `zu' ending
    'vi',      # intransitive verb
    'vk',      # kuru verb - special class
    'vn',      # irregular nu verb
    'vs',      # noun or participle which takes the aux. verb suru
    'vs-c',    # su verb - precursor to the modern suru
    'vs-i',    # suru verb - irregular
    'vs-s',    # suru verb - special class
    'vt',      # transitive verb
    'vz',      # Ichidan verb - zuru verb - (alternative form of -jiru verbs)
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
        kunyomi = ', '.join(filter(lambda x: filter(is_hiragana, x), segments[1:]))
        onyomi = ', '.join(filter(lambda x: filter(is_katakana, x), segments[1:]))
        glossary = '; '.join(re.findall('\{([^\}]+)\}', line))
        results[character] = (kunyomi, onyomi, glossary)

    return results


def parse_krad_file(path):
    results = {}

    for line in load_definitions(path):
        segments = line.split(' ')
        character = segments[0]
        radicals = ' '.join(segments[2:])
        results[character] = radicals;

    return results


def parse_edict(path):
    defs = []
    for line in load_definitions(path):
        segments = line.split('/')

        expression = segments[0].split(' ')
        term = expression[0]
        match = re.search('\[([^\]]+)\]', expression[1])
        reading = None if match is None else match.group(1)

        glossary = '; '.join(filter(lambda x: len(x) > 0, segments[1:]))
        glossary = re.sub('\(\d+\)\s*', '', glossary)

        tags = []
        for group in re.findall('\(([^\)\]]+)\)', glossary):
            tags.extend(group.split(','))

        tags = set(tags).intersection(PARSED_TAGS)
        tags = ' '.join(tags)

        defs.append((term, reading, glossary, tags))

    term_indices = {}
    reading_indices = {}

    for i, d in enumerate(defs):
        term, reading = d[:2]

        if term is not None:
            term_list = term_indices.get(term, [])
            term_list.append(i)
            term_indices[term] = term_list

        if reading is not None:
            reading_list = reading_indices.get(reading, [])
            reading_list.append(i)
            reading_indices[reading] = reading_list

    return {
        'defs': defs,
        't_idx': term_indices,
        'r_idx': reading_indices
    };


def build_dict(output_dir, input_file, parser):
    if input_file is not None:
        base = os.path.splitext(os.path.basename(input_file))[0]
        with open(os.path.join(output_dir, base) + '.json', 'w') as fp:
            # json.dump(parser(input_file), fp, sort_keys=True, indent=4, separators=(',', ': '))
            json.dump(parser(input_file), fp)


def build(dict_dir, kanjidic, kradfile, edict, enamdict):
    build_dict(dict_dir, kanjidic, parse_kanji_dic)
    build_dict(dict_dir, kradfile, parse_krad_file)
    build_dict(dict_dir, edict, parse_edict)
    build_dict(dict_dir, enamdict, parse_edict)


def main():
    parser = optparse.OptionParser()
    parser.add_option('--kanjidic', dest='kanjidic')
    parser.add_option('--kradfile', dest='kradfile')
    parser.add_option('--edict', dest='edict')
    parser.add_option('--enamdict', dest='enamdict')

    options, args = parser.parse_args()

    if len(args) == 0:
        parser.print_help()
    else:
        build(
            args[0],
            options.kanjidic,
            options.kradfile,
            options.edict,
            options.enamdict
        )


if __name__ == '__main__':
    main()
