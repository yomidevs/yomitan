import json
import os
from datetime import datetime

lang_short = os.environ.get('language_short')
dict_name = os.environ.get('DICT_NAME')

if not os.path.exists(f'data/freq/{lang_short}-freq.json'):
    print(f'No {lang_short}-freq.json file found')
    exit(-1)

# Read frequencies.json
with open(f'data/freq/{lang_short}-freq.json', 'r', encoding='utf-8') as f:
    frequencies = json.load(f)

print('opening term dictionary')
dict2 = []
i = 1
while True:
    try:
        with open(f'data/temp/dict/term_bank_{i}.json', 'r') as f:
            data = json.load(f)
            dict2.extend(data)
        i += 1
    except FileNotFoundError:
        break

print(len(dict2))

words = set(word[0] for word in dict2)

result = []
total_items = len(frequencies)
processed_items = 0
i = 1
for key, value in frequencies.items():
    if(key in words):
        result.append([key, 'freq', {'reading': key, 'frequency': i}])
        i+=1
    processed_items += 1


    # Calculate and print progress
    progress = (processed_items / total_items) * 100
    print(f"Converting counts to ranks: {progress:.2f}%", end='\r')  # Use '\r' to overwrite the line
print("Converting counts to ranks: 100.00%")

if(len(result)):
    index = {}
    index['title'] = f"{dict_name}-freq-" + lang_short.lower()
    index['revision'] = datetime.now().strftime("%Y.%m.%d")
    index['format'] = 4
    index['sequenced'] = True
    with open('data/temp/freq/index.json', 'w') as f:
        json.dump(index, f, ensure_ascii=False, indent=4)

chunkSize = 100000
for i in range(0, len(result), chunkSize):
    with open('data/temp/freq/term_meta_bank_' + str(int(i/chunkSize + 1)) + '.json', 'w') as f:
        chunkStart = i
        chunkEnd = i + chunkSize if i + chunkSize < len(result) else len(result)
        print('writing chunk', chunkStart, chunkEnd)
        json.dump(result[chunkStart:chunkEnd], f, ensure_ascii=False, indent=4)


print("Freq to rank complete", len(result))
