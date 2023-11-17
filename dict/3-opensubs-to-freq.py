import sqlite3
import zipfile
import io
import csv
import os
import string
import time
import json
import collections

max_sentences = int(os.environ.get("MAX_SENTENCES"))
lang_short = os.environ.get("language_short")
opensubsPath = os.environ.get("OPENSUBS_PATH")

db_name = 'opensubs.db'
db_path = opensubsPath + db_name

meta_folder = 'data/freq'
subs_metadata_path = f'{meta_folder}/subtitles_all_f.txt'
subs_errors_path = f'{meta_folder}/subtitles_errs.txt'
subs_metadata_folder = f'{meta_folder}/metadata'

con = sqlite3.connect(db_path)
con.row_factory = sqlite3.Row

def save(name, file, path):
    name = name.split('"')[1]
    with open(os.path.join(path, name), 'wb') as w:
        w.write(file)

def get_range(start, end):
    with con:
        cur = con.cursor()
        cur.execute("select * from subz where num >= (?) and num <= (?)", (start, end,))
        rows = cur.fetchall()
    return rows

def get_single(num):
    with con:
        cur = con.cursor()
        cur.execute("select * from subz where num = (?)", (num,))
        row = cur.fetchone()
    return row

def tableinfo(table_name='subz'):
    cursor = con.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    column_names = [column[1] for column in columns]

    print("Column names:", column_names)

def dbInfo():
    cursor = con.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    table_names = [table[0] for table in tables]
    print("Table names:", table_names)

def cleanupMeta():
    infile = opensubsPath + 'subtitles_all.txt'
    outfilePath = os.path.join(os.path.dirname(__file__), subs_metadata_path)
    errfilePath = os.path.join(os.path.dirname(__file__), subs_errors_path)
    num_cols = 16
    buf = ""
    limit = -1
    with open(infile, 'r') as inf, open(outfilePath, 'w') as outf, open(errfilePath, 'w') as errf:
        for line in inf:
            if limit == 0:
                break
            if len(line.split('\t')) < num_cols:
                buf += line.replace('\n', '')
                if len(buf.split('\t')) == num_cols:
                    outf.write(buf + '\n')
                elif len(buf.split('\t')) > num_cols:
                    errf.write(buf + '\n')
                else:
                    continue
                buf = ""
            elif len(line.split('\t')) > num_cols:
                errf.write(line)
            else:
                outf.write(line)
            limit -= 1

def get_total_rows(metadata_path):
    print("Getting total number of rows...")
    total_rows = 0
    with open(metadata_path, 'r') as csvfile:
        csvreader = csv.reader(csvfile, delimiter='\t')
        total_rows = sum(1 for _ in csvreader) - 1  # Subtract 1 to exclude the header row

    print(f"Total number of rows: {total_rows}")
    return total_rows

def load_metadata(language = None, delimiter = ','):
    print("Loading metadata...")
    metadata = {}

    metadata_paths = [subs_metadata_path if language is None else f'./{subs_metadata_folder}/metadata_{language}.txt']
    if (language == 'sh'):
        metadata_paths = [
            f'./{subs_metadata_folder}/metadata_sr.txt',
            f'./{subs_metadata_folder}/metadata_bs.txt',
            f'./{subs_metadata_folder}/metadata_hr.txt',
        ]

    for metadata_path in metadata_paths:
        with open(metadata_path, 'r') as csvfile:
            csvreader = csv.reader(csvfile, delimiter=delimiter)

            for i, row in enumerate(csvreader):
                subtitle_id = row[0]
                metadata[subtitle_id] = row

                print(f"Loading metadata: {i}", end='\r') 

    print("Metadata loading complete")
    return metadata

def analyze_metadata(metadata):
    total_subtitles = len(metadata)
    analyzed_subtitles = 0

    languages = {}
    formats = {}
    fileCounts = {}

    for subtitle_id, row in metadata.items():
        if analyzed_subtitles == 0:
            analyzed_subtitles += 1
            continue
        try:
            language = row[4]
        except IndexError:
            print("Index error:", row)
            raise(IndexError)
            
        if language not in languages:
            languages[language] = []

        languages[language].append(row)

        format = row[7]
        if format not in formats:
            formats[format] = 0
        formats[format] += 1

        fileCount = row[8]
        if fileCount not in fileCounts:
            fileCounts[fileCount] = 0
        fileCounts[fileCount] += 1

        analyzed_subtitles += 1
        progress = (analyzed_subtitles / total_subtitles) * 100
        print(f"Progress: {progress:.2f}%", end='\r')

     # Sort languages and formats by descending size
    print("Sorting languages and formats...")
    language_breakdown = {k: len(v) for k, v in languages.items()}

    print("Language breakdown (sorted):", sort_breakdown(language_breakdown))
    print("Format breakdown (sorted):", sort_breakdown(formats))
    print("Number of files breakdown (sorted):", sort_breakdown(fileCounts))

    return languages, total_subtitles

def sort_breakdown(breakdown):
    return {k: v for k, v in sorted(breakdown.items(), key=lambda item: item[1], reverse=True)}

def write_metadata():
    print('Splitting metadata by language...')
    metadata = load_metadata(delimiter='\t')
    languages, total_subtitles = analyze_metadata(metadata)

    analyzed_subtitles = 0

    for language, data in languages.items():
        with open(os.path.join(subs_metadata_folder, f'metadata_{language}.txt'), 'w', newline='') as metadata_file:
            csvwriter = csv.writer(metadata_file, delimiter=',')  # Change the delimiter to a comma
            csvwriter.writerow(data[0])
            for row in data:
                csvwriter.writerow(row)
                analyzed_subtitles += 1
                progress = (analyzed_subtitles / total_subtitles) * 100
                print(f"Progress: {progress:.2f}%", end='\r')

if __name__ == '__main__':
    if not os.path.exists(subs_metadata_path):
        print("First time setup: splitting metadata by language...")
        cleanupMeta()
        write_metadata()

    metadata = load_metadata(lang_short)
    analyze_metadata(metadata)
    metadata = {int(k): v for k, v in sorted(metadata.items(), key=lambda item: int(item[0]))}

    encodings_for_lang = {
        'ru': ['cp1251', 'cp866', 'iso8859_5'],
        'sq': ['iso8859_1'],
        'de': ['iso8859_1'],
        'pt': ['iso8859_1'],
        'es': ['iso8859_1'],
        'el': ['iso8859_7', 'cp1253', 'cp737'],
        'en': ['iso8859_1'],
        'it': ['iso8859_1'],
        'fr': ['iso8859_1'],
        'sh': ['iso8859_2'],
    }
    encodings_to_try = (encodings_for_lang.get(lang_short, []) + ['utf-8', 'iso8859_1'])

    # Extract a list of sorted metadata IDs
    keys = list(metadata.keys())

    # Initialize a counter for consecutive numbers and a list to store batch ranges
    consecutive_count = 0
    batch_ranges = []

    # Loop through the list using a for loop
    for i in range(len(keys) - 1):
        current = keys[i]
        next_number = keys[i + 1]

        if current + 1 == next_number:
            consecutive_count += 1
        else:
            # When a break in consecutive IDs is detected, add the batch range to the list
            batch_ranges.append((current - consecutive_count, current))
            consecutive_count = 0

    rowCount = len(keys)
    print('total rows', rowCount)
    print('total consecutive rows', sum([x[1] - x[0] for x in batch_ranges]))
    print('total batches', len(batch_ranges))

    # Add the last batch range
    batch_ranges.append((keys[-1] - consecutive_count, keys[-1]))

    fileLimit = 1000000
    fileCount = 0
    skipReasons = {}
    frequencies = collections.Counter()
    sentences = []

    start_time = time.time()

    punctuation_to_remove = string.punctuation + '«»…♪\uFEFF' 
    translation_table = str.maketrans(punctuation_to_remove, ' ' * len(punctuation_to_remove))

    for batch_start, batch_end in batch_ranges:
        if fileCount >= fileLimit or len(sentences) >= max_sentences:
            break
        rows = get_range(batch_start, batch_end)
        for row in rows:

            id = row['num']

            if metadata[id][7] != 'srt':
                skipReasons['not_srt'] = skipReasons.get('not_srt', 0) + 1
                continue

            if metadata[id][8] != '1':
                skipReasons['multifile'] = skipReasons.get('multifile', 0) + 1
                continue

            zip_data = io.BytesIO(row['file'])
            with zipfile.ZipFile(zip_data, 'r') as zip_file:

                file_list = zip_file.namelist()

                srt_file = next((file for file in file_list if file.lower().endswith('.srt')), None)

                if srt_file in file_list:
                    with zip_file.open(srt_file) as file:
                        content = file.read()

                        decoded_content = None

                        for encoding in encodings_to_try:
                            try:
                                decoded_content = content.decode(encoding)
                                break
                            except UnicodeDecodeError:
                                pass
                        if decoded_content is not None:

                            if(lang_short != 'de'):
                                decoded_content = decoded_content.lower()

                            lines = decoded_content.splitlines()
                            
                            for line in lines:
                                if line and not line.isdigit() and "-->" not in line:
                                    line = line.translate(translation_table)
                                    line = ' '.join(line.split()[:100])

                                    sentences.append(line)
                                    words = line.split()
                                    frequencies.update(words)
                                   
                        else:
                            skipReasons['encoding'] = skipReasons['encoding'] + 1 if 'encoding' in skipReasons else 1
                            print("Unable to decode the text with the specified encodings.", encodings_to_try)
                else:
                    skipReasons['missing_file'] = skipReasons['missing_file'] + 1 if 'missing_file' in skipReasons else 1

        fileCount += batch_end - batch_start + 1
        progress = (fileCount / rowCount) * 100
        print(f"Processed subtitle files: {progress:.2f}%", end='\r')

    frequencies = dict(frequencies)

    end_time = time.time()

    skipCount = sum(skipReasons.values())
    print('time taken', end_time - start_time)
    print('time per file', (end_time - start_time) / (fileCount-skipCount))
    print('skipped percentage', skipCount / fileCount * 100)
    print('skip reasons', sort_breakdown(skipReasons))
    print('word count', len(frequencies.keys()))

    print('dumping frequencies')
    with open(f'data/freq/{lang_short}-frequencies.json', 'w', encoding='utf-8') as f:
        json.dump(sort_breakdown(frequencies), f, ensure_ascii=False, indent=4)

    print('dumping sentences')
    with open(f'data/sentences/{lang_short}-sentences.json', 'w', encoding='utf-8') as f:
        json.dump(sentences, f, ensure_ascii=False, indent=4)
