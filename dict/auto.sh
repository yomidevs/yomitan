#!/bin/bash

source .env

export MAX_SENTENCES
export DEBUG_WORD
export OPENSUBS_PATH
export DICT_NAME


# Check for the language and language_short arguments
if [ -z "$1" ]; then
  echo "Usage: $0 <language> [flags]"
  exit 1
fi

# Parse flags
all_languages=false
redownload=false
force_tidy=false
force_freq=false
force_yez=false
force=false

flags=('a' 'd' 't' 'f' 'y' 'F')
for flag in "${flags[@]}"; do
  case "$2" in 
    *"$flag"*) 
      case "$flag" in
        'a') all_languages=true ;;
        'd') redownload=true ;;
        't') force_tidy=true ;;
        'f') force_freq=true ;;
        'y') force_yez=true ;;
        'F') force=true ;;
      esac
      ;;
  esac
done

if [ "$force" = true ]; then
  force_tidy=true
  force_freq=true
  force_yez=true
fi

echo "[a] all_languages: $all_languages"
echo "[d] redownload: $redownload"
echo "[F] force: $force"
echo "[t] force_tidy: $force_tidy"
echo "[f] force_freq: $force_freq"
echo "[y] force_yez: $force_yez"

# Step 1: Install dependencies
npm i

# Step 2: Run create-folder.js with the language argument
node 1-create-folders.js

languages=$(jq '.' ../ext/js/language/languages.json)

export lang="$1"

declare -a entries="($(
  jq -r '.[] | @json | @sh' ../ext/js/language/languages.json
))"

# Iterate over the array
for entry in "${entries[@]}"; do
  # Extract values from the object
  iso=$(echo "${entry}" | jq -r '.iso')
  language=$(echo "${entry}" | jq -r '.language')
  flag=$(echo "${entry}" | jq -r '.flag')
  
  if [ "$language" != "$lang" ] && [ "$all_languages" = false ]; then
    continue
  fi

  echo "PROCESSING $language ------------------------------------"

  export language="$language"
  export language_short="$iso"

  # Calculate URL
  filename="kaikki.org-dictionary-$language.json"
  if [ "$language" = "Serbo-Croatian" ]; then
    filename="kaikki.org-dictionary-SerboCroatian.json"
  fi

  export filename

  url="https://kaikki.org/dictionary/$language/$filename"

  # Step 3: Download JSON data if it doesn't exist
  if [ ! -f "data/kaikki/$filename" ] || [ "$redownload" = true ]; then
    echo "Downloading $filename from $url"
    wget "$url"
    
    mv $filename "data/kaikki/"
  else
    echo "Kaikki dict already exists. Skipping download."
  fi

  # Step 4: Run tidy-up.js if the tidy files don't exist
  if \
    [ ! -f "data/tidy/$language_short-forms.json" ] || \
    [ ! -f "data/tidy/$language_short-lemmas.json" ] || \
    [ "$force_tidy" = true ]; then
    echo "Tidying up $filename"
    node --max-old-space-size=4096 2-tidy-up.js
  else
    echo "Tidy file already exists. Skipping tidying."
  fi

  # Step 5 (optional): Create an array of sentences
  if \
    [ ! -f "data/sentences/$language_short-sentences.json" ] || \
    [ "$force_freq" = true ]; then
    if [ -d "$OPENSUBS_PATH" ]; then
      echo "Creating sentences file"
      python3 3-opensubs-to-freq.py
    else
      echo "OpenSubtitles path not found. Skipping sentence creation."
    fi
  else
    echo "Sentences file already exists. Skipping sentence creation."
  fi

  # Step 6: Create a frequency list
  if \
    [ ! -f "data/freq/$language_short-freq.json" ] || \
    [ "$force_freq" = true ]; then
    echo "Creating frequency file"
    node 4-create-freq.js
  else
    echo "Freq file already exists. Skipping freq creation."
  fi

  dict_file="$DICT_NAME-dict-$language_short.zip"
  ipa_file="$DICT_NAME-ipa-$language_short.zip"
  freq_file="$DICT_NAME-freq-$language_short.zip"

  # Step 7: Create Yezichak files
  if \
    [ ! -f "$dict_file" ] || \
    [ ! -f "$ipa_file" ] || \
    [ "$force_yez" = true ]; then
    echo "Creating Yezichak dict and IPA files"
    if node 5-make-yezichak.js; then
      zip -j "$dict_file" data/temp/dict/index.json data/temp/dict/tag_bank_1.json data/temp/dict/term_bank_*.json
      zip -j "$ipa_file" data/temp/ipa/index.json data/temp/ipa/tag_bank_1.json data/temp/ipa/term_meta_bank_*.json
    else
      echo "Error: Yezichak generation script failed."
    fi
  else
    echo "Yezichak dict already exists. Skipping Yezichak creation."
  fi

  # Step 8: Convert frequency list to rank-based Yezichak format
  if \
    [ ! -f "$freq_file" ] || \
    [ "$force_yez" = true ]; then
    echo "Creating Yezichak freq files"
    if python3 6-freq-to-rank.py; then
      zip -j "$freq_file" data/temp/freq/index.json data/temp/freq/term_meta_bank_*.json
    else
      echo "Error: Frequency to rank conversion script failed."
    fi
  else
    echo "Yezichak freq already exists. Skipping Yezichak creation."
  fi

  if [ -f "$dict_file" ]; then
    mv "$dict_file" "data/language/$language_short/"
  fi

  if [ -f "$ipa_file" ]; then
    mv "$ipa_file" "data/language/$language_short/"
  fi

  if [ -f "$freq_file" ]; then
    mv "$freq_file" "data/language/$language_short/"
  fi

  echo "FINISHED $language ------------------------------------"
done
echo "All done!"