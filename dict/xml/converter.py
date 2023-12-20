from bs4 import BeautifulSoup
import json
from pprintpp import pprint
import string
import json
import math
import os
from datetime import datetime
import zipfile
import sys

sourceLanguage = None
targetLanguage = None
if len(sys.argv) > 1:
    sourceLanguage = sys.argv[1]
if len(sys.argv) > 2:
    targetLanguage = sys.argv[2]

DEBUG_ROW = None

def find_tag(tags, tag):
    tag = tag.lower()
    full_tag = next(
        (
            x for x in tags if 
                (isinstance(x[3], str) and x[3].lower() == tag) or 
                (isinstance(x[3], list) and tag in [xTag.lower() for xTag in x[3]])
        ), None
    )

    result = full_tag.copy() if full_tag else None

    if result and isinstance(result[3], list):
        result[3] = result[3][0]

    return result

def write_in_batches(input_array, filename_prefix, batch_size=100000, temp_path='.'):
    bank_index = 0

    while input_array:
        batch = input_array[:batch_size]
        input_array = input_array[batch_size:]

        bank_index += 1
        filename = f'{temp_path}/{filename_prefix}{bank_index}.json'

        with open(filename, 'w', encoding='utf-8') as file:
            json.dump(batch, file, indent=2, ensure_ascii=False)

def zip_files(folder_path, zip_filename, files_to_zip):
    with zipfile.ZipFile(zip_filename, 'w') as zipf:
        for file in files_to_zip:
            file_path = os.path.join(folder_path, file)
            zipf.write(file_path, file)

def get_elements_by_attribute(node_list, attribute_name):
    elements = [element for element in node_list if element.has_attr(attribute_name)]
    return elements

def incrementCounter(key, counter, bool=True):
    if bool:
        keys = key.split('.')  # Assuming keys are separated by dots
        current_counter = counter

        for k in keys:
            if k not in current_counter:
                current_counter[k] = {}
            current_counter = current_counter[k]

        # Increment the last key
        current_counter['n'] = current_counter.get('n', 0) + 1

def sort_breakdown(obj):
    sorted_obj = dict(sorted(obj.items(), key=lambda item: item[1], reverse=True))
    return sorted_obj

def clean(dirty):
    cleanString = dirty.translate(str.maketrans('', '', string.punctuation)).strip()
    return cleanString

def getCrossRefs(soup):
            return [clean(xr.get_text()) for xr in soup.select('span.xr')]

def delete_files(file_paths):
    for file_path in file_paths:
        try:
            os.remove(file_path)
        except OSError as e:
            print(f"Error deleting {file_path}: {e}")

def getCrossRefText(xr_node):
    xrSoup = BeautifulSoup(str(xr_node), 'xml')
    if (hm := xrSoup.select('span.hm')) and len(hm):
        for tag in hm:
            tag.decompose()
    if((xrLabelGroup := xrSoup.select('span.xrlabelGroup')) and len(xrLabelGroup)):
        for tag in xrLabelGroup:
            tag.decompose()
    return clean(xrSoup.get_text())

def load_json_array(file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        print(f"File not found: {file_path}")
        return []
    except json.JSONDecodeError:
        print(f"Error decoding JSON in file: {file_path}")
        return [] 

def getXMLfromLine(line):
    return json.loads('{' + line + '}', strict=False).popitem()[1]
 
current_date = datetime.now().strftime('%Y.%m.%d')

with open('dicts.json') as file:
    dicts = load_json_array('dicts.json')

print(f'Converting dictionaries for sourceLanguage={sourceLanguage} and targetLanguage={targetLanguage}')

for dictionary in dicts:
    if sourceLanguage and dictionary['source'] != sourceLanguage or targetLanguage and dictionary['target'] != targetLanguage:
        continue
    print(f'Converting {dictionary["file"]}.json [{dictionary["source"]}-{dictionary["target"]}] ({dictionary.get("from", 0)}-{dictionary.get("to", "end")})')

    with open(f'{dictionary["file"]}.json') as file:

        commonTags = load_json_array('../data/language/tag_bank_term.json')
        languageTags = load_json_array(f'../data/language/{dictionary["source"]}/tag_bank_term.json')
        commonIpaTags = load_json_array('../data/language/tag_bank_ipa.json')
        languageIpaTags = load_json_array(f'../data/language/{dictionary["source"]}/tag_bank_ipa.json')

        outputPath = f"languages/{dictionary['source']}"
        if not os.path.isdir(outputPath):
            os.makedirs(outputPath)

        termTags = commonTags + languageTags
        ipaTags = commonIpaTags + languageIpaTags
        termTagBank = {}
        ipaTagBank = {}
        skippedTermTags = {}
        skippedIpaTags = {}
        counters = {}
        noPosCount = 0
        noEntriesCount = 0

        def normalizeOrthography(word, language="en"):
            if language == "de":
                removeDiacritics = [
                    '\u0332', #combining low line
                    '\u0323', #combining dot below
                    '\u00b7', #middle dot
                ]

                for diacritic in removeDiacritics:
                    word = word.replace(diacritic, '')

                return word

            return word

        def getPartOfSpeechFromSoup(soup):
            partsOfSpeech = soup.select('span[pos]')
            
            result = []
            for pos in partsOfSpeech:
                pos = clean(pos.get_text())
                full_pos = find_tag(termTags, pos)
                if full_pos:
                    termTagBank[full_pos[0]] = full_pos
                    pos = full_pos[0]
                else:
                    incrementCounter("pos-"+pos, skippedTermTags)
                result.append(pos)
            return ' '.join(result)

        def parse_xml(xml):
            global noPosCount
            soup = BeautifulSoup(xml, 'xml')

            term = soup.find('d:entry')
            if not term:
                incrementCounter('no d:entry!?', counters)
                return [], []
            term = term.get('d:title')
            if not term:
                incrementCounter('no d:title?!', counters)
                return [], []
            
            term = normalizeOrthography(term, dictionary['source'])

            reading = term
            
            entries = {}
            def add_to_entries(
                    pos, 
                    joined_tags, 
                    definition, 
                    crossRef='',
                    inflectionHypothesis = None
                ):
                id = joined_tags + crossRef
                if id in entries:
                    if definition:
                        if definition not in entries[id][5]:
                            entries[id][5].append(definition)
                    if inflectionHypothesis:
                        if inflectionHypothesis not in entries[id][9]:
                            entries[id][9].append(inflectionHypothesis)
                else:
                    definition_tags = ' '.join(filter(None, [pos, joined_tags]))
                    entries[id] = [
                        term,                                                   # term
                        reading,                                                # reading
                        definition_tags,                                        # definition_tags
                        pos,                                                    # grammar rules
                        0,                                                      # frequency
                        [definition] if definition else [],                     # definitions
                        0,                                                      # sequence
                        '',                                                     # term_tags
                        crossRef,                                               # lemma form (if non-lemma)
                        [inflectionHypothesis] if inflectionHypothesis else [], # inflection hypotheses
                    ]

            grammarBlocks = soup.select('span.gramb')
            if not len(grammarBlocks):
                incrementCounter('noGramb', counters)

                pos = getPartOfSpeechFromSoup(soup)
                incrementCounter('noGramb.pos', counters, pos)
                incrementCounter('noGramb.noPos', counters, not pos)

                definitions = [clean(cntxt.get_text()) for cntxt in soup.select('span.cntxt')]

                incrementCounter('noGramb.multipleCntxt', counters, len(definitions) > 1)

                for definition in definitions:
                    add_to_entries(pos, '_', definition)

                crossRefs = [getCrossRefText(xr) for xr in soup.select('span.hwg span.xr')]

                incrementCounter('noGramb.multipleXr', counters, len(crossRefs) > 1)

                for xr in crossRefs:
                    add_to_entries(pos, 'non-lemma', '', xr, [f'{term} ▶ {xr}'])

                incrementCounter('noGramb.cntxt', counters, len(definitions))
                incrementCounter('noGramb.xr', counters, len(crossRefs))
                incrementCounter('noGramb.cntxtAndXr', counters, len(definitions) and len(crossRefs))

            for grammarBlock in grammarBlocks:
                incrementCounter('gramb', counters)
                grambSoup = BeautifulSoup(str(grammarBlock), 'xml')
                
                grammarInfo = grambSoup.select_one('span.gramb > span.gr')
                grammarInfo = grammarInfo.get_text() if grammarInfo else None
                
                pos = getPartOfSpeechFromSoup(grambSoup)
                incrementCounter('gramb.noPos', counters, not pos)
                incrementCounter('gramb.pos', counters, pos)

                for semanticBlock in grambSoup.select('span.semb'):
                    incrementCounter('gramb.semb', counters)
                    sembSoup = BeautifulSoup(str(semanticBlock), 'xml')

                    for ex in sembSoup.select('span.exg'):
                        example = ex.extract()

                    efDefs = [tag.get_text() for tag in sembSoup.select('span.ef')]
                 
                    definitions = sembSoup.select('span[def]')

                    if(len(definitions)):
                        incrementCounter('gramb.semb.Defs.multipleDefs', counters, len(definitions) > 1)
                        for definition in definitions:
                            crossRefs = BeautifulSoup(str(definition), 'xml').select('span.xr')
                            incrementCounter('gramb.semb.Defs.multipleXrInDef', counters, len(crossRefs) > 1)
                            for xr in crossRefs:
                                if (prev := xr.previous_sibling) and prev.name == 'span' and prev.get('class') == 't':
                                    incrementCounter('gramb.semb.Defs.xrWithT', counters)
                                    incrementCounter('gramb.semb.Defs.xrWithT.alsoGr', counters, grammarInfo)
                                    grammarInfo = prev.get_text() or grammarInfo
                                
                                xr = getCrossRefText(xr)
                                redirect = grammarInfo or f'{term} ▶ {xr}'
                                add_to_entries(pos, 'non-lemma', '▶', xr, [redirect])

                        definitionTexts = [clean(defi.get_text()) for defi in definitions]
                        definitionTexts = [defi for defi in definitionTexts if defi]
                        efPrefix = f'[{"; ".join(efDefs)}] ' if len(efDefs) else ''
                        definitionTexts = [efPrefix + definitionText for definitionText in definitionTexts]
                    else:
                        efDefs = []
                        # efDefs = [tag.get_text() for tag in sembSoup.select('span.ef') if tag.get_text()]
                        for tag in sembSoup.select('span.ef'):
                            if (efText:= tag.get_text()) and efText.strip():
                                efDefs.append(tag.get_text())
                                incrementCounter('gramb.noDefs.efDefs', counters)
                            else:
                                incrementCounter('gramb.noDefs.emptyEfDefs', counters)
                        definitionTexts = efDefs
                    if not len(definitionTexts) or len(definitionTexts) == 1 and definitionTexts[0].strip()[0] == '▶':
                        definitionTexts = []
                        for xrGroup in sembSoup.select('span.xrg'):
                            xrGroupSoup = BeautifulSoup(str(xrGroup), 'xml')
                            crossRefs = xrGroupSoup.select('span.xr')
                            if(len(crossRefs) < 3):
                                for xr in crossRefs:
                                    xrTerm = getCrossRefText(xr)
                                    add_to_entries(pos, 'non-lemma', '▶', xrTerm, [f'{term} ▶ {xrTerm}'])
                            else:
                                incrementCounter('more than 2 xr in xrg...', counters)
                    if not len(definitionTexts):
                        definitionTexts = [clean(gloss.get_text()) for gloss in sembSoup.select('span.gl')]
                    for definition in definitionTexts:
                        incrementCounter('gramb.semb.Defs', counters)
                        indTags = [clean(tag.get_text()) for tag in sembSoup.select('span:is(.x_xhd, .x_xd2) > span.ind')] #disambiguation
                        otherTags = [clean(tag.get_text()) for tag in sembSoup.select('span:is(.x_xhd, .x_xd2) > span:is(.fld, .reg, .gr)')] #field, region, grammar
                        
                        recognizedTags = []
                        unrecognizedTags = []

                        for tag in otherTags:
                            full_tag = find_tag(termTags, tag)
                            if full_tag:
                                termTagBank[full_tag[0]] = full_tag
                                recognizedTags.append(full_tag[0])
                            else:
                                incrementCounter(tag, skippedTermTags)
                                unrecognizedTags.append(tag)

                        if definition.startswith('='):
                            definition = definition[1:].strip()
                        
                        rawTags = indTags + unrecognizedTags
                        rawTagsString = '(' + ', '.join(rawTags) + ') ' if len(rawTags) else ''
                        definition = rawTagsString + definition

                        joined_tags = ' '.join(recognizedTags)

                        add_to_entries(pos, joined_tags, definition.strip())
            
            ipa_dict = []
            for element in get_elements_by_attribute(soup.find_all('span'), 'd:prn'):
                dialect = element['dialect'] if 'dialect' in element.attrs else None
                if dialect:
                    if full_dialect := find_tag(ipaTags, dialect):
                        ipaTagBank[full_dialect[0]] = full_dialect
                        dialect = full_dialect[0]
                    else:
                        incrementCounter("ipa-"+dialect, skippedIpaTags)

                ipa_dict.append([
                    term,
                    'ipa',
                    {
                        'reading': term,
                        'ipa': [
                            {
                                'ipa': element.get_text(),
                                'tags': [dialect] if dialect else []
                            }
                        ]
                    }
                ])

            new_entries = list(entries.values())
            return new_entries, ipa_dict

        termBank = []
        ipaBank = []

        dictFrom = dictionary['from'] if 'from' in dictionary else -math.inf
        dictTo = dictionary['to'] if 'to' in dictionary else math.inf

        for line in file:
            incrementCounter('lines', counters)
            print(counters['lines']['n'], end='\r')

            if counters['lines']['n'] < dictFrom:
                continue
            if counters['lines']['n'] > dictTo:
                break

            if DEBUG_ROW:
                if counters['lines']['n'] < DEBUG_ROW:
                    continue
                if counters['lines']['n'] > DEBUG_ROW:
                    break

            if line.strip().startswith('"##'):
                print(counters['lines']['n'], line.strip())
            elif line.strip().startswith('"') and ':' in line:
                line = line.rstrip(',\n')

                xml = getXMLfromLine(line)

                new_entries, new_ipa = parse_xml(xml)
                termBank.extend(new_entries)
                ipaBank.extend(new_ipa)

                incrementCounter('entries.no', counters, not len(new_entries))
                incrementCounter('entries.yes', counters, len(new_entries))
                incrementCounter('entries.yes.multiple', counters, len(new_entries) > 1)
            else:
                print(counters['lines']['n'], 'ERROR', line.strip())

            if counters['lines']['n'] > 1000000:
                break
        
        dictFiles = ['index.json', 'tag_bank_1.json'] + [f'term_bank_{i}.json' for i in range(1, math.ceil(len(termBank) / 10000) + 1)]
        
        title = f'yzkX-{dictionary["source"]}-{dictionary["target"]}'

        zipFile = f'{outputPath}/{title}.zip'

        delete_files([zipFile])

        indexObj = {
            'format': 4,
            'revision': current_date,
            'sequenced': True,
            'title': title
        }

        with open(f'{outputPath}/index.json', 'w', encoding='utf-8') as file:
            json.dump(indexObj, file, indent=2)

        with open(f'{outputPath}/tag_bank_1.json', 'w', encoding='utf-8') as file:
            json.dump(list(termTagBank.values()), file, indent=2)

        write_in_batches(termBank, 'term_bank_', 10000, outputPath)

        zip_files(outputPath, zipFile, dictFiles)

        delete_files([f'{outputPath}/{file}' for file in dictFiles])

        title = f'yzkX-{dictionary["source"]}-ipa'
        
        indexObj['title'] = title

        with open(f'{outputPath}/index.json', 'w', encoding='utf-8') as file:
            json.dump(indexObj, file, indent=2)

        with open(f'{outputPath}/tag_bank_1.json', 'w', encoding='utf-8') as file:
            json.dump(list(ipaTagBank.values()), file, indent=2)
        
        print('ipaBank', len(ipaBank))
        write_in_batches(ipaBank, 'term_meta_bank_', 10000, outputPath)

        dictFiles = ['index.json', 'tag_bank_1.json'] + [f'term_meta_bank_{i}.json' for i in range(1, math.ceil(len(ipaBank) / 10000) + 1)]

        zipFile = f'{outputPath}/{title}.zip'

        zip_files(outputPath, zipFile, dictFiles)

        delete_files([f'{outputPath}/{file}' for file in dictFiles])

        file_path = f'{outputPath}/skippedTermTags.json'

        with open(file_path, 'w', encoding='utf-8') as json_file:
            keyValue = {key: value['n'] for key, value in skippedTermTags.items()}
            json.dump(sort_breakdown(keyValue), json_file, indent=2)

        with open(f'{outputPath}/skippedIpaTags.json', 'w', encoding='utf-8') as json_file:
            keyValue = {key: value['n'] for key, value in skippedIpaTags.items()}
            json.dump(sort_breakdown(skippedIpaTags), json_file, indent=2)

        pprint(counters)