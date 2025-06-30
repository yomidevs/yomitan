// georgian-transforms.js
import { suffixInflection } from "../language-transforms.js";

const suffixes = [
  "ები", "ებს", "ებების", // plural suffixes
  "მა", // ergative
  "ს",  // dative
  "ის", // genitive
  "ით", // instrumental
  "ად", // adverbial
  "ო",  // vocative
  "ში", "ზე",
  "შია", "ზეა",
];

const nominativeSuffix = "ი";

// Stem completion (for consonant endings)
const stemCompletionRules = [
  suffixInflection("გნ", "გნი", ["n", "adj"], ["n", "adj"]),
  suffixInflection("ნ", "ნი", ["n", "adj"], ["n", "adj"]),
];

// Vowel restoration example (optional, extend as needed)
const vowelRestorationRules = [
  suffixInflection("გ", "გა", ["n", "adj"], ["n", "adj"]),
];

// Helper to check adjective vowel endings (except ი)
function endsWithVowelExceptI(word) {
  return /[აეოუუ]$/.test(word);
}

export const georgianTransforms = {
  language: "kat",
  conditions: {},
  transforms: {
    adjectiveNoDecline: {
      name: "adj-no-decline",
      description: "If adjective ends with vowel except ი, no declension",
      rules: [
        {
          apply: (word, pos) => {
            if (pos === "adj" && endsWithVowelExceptI(word)) {
              return [word];
            }
            return null;
          }
        }
      ],
    },
    nounAdjSuffixStripping: {
      name: "noun-adj-suffix-stripping",
      description: "Strip Georgian noun and adjective declension suffixes",
      rules: suffixes.map((suffix) =>
        suffixInflection(suffix, "", ["n", "adj"], ["n", "adj"])
      ),
    },
    nounAdjStemCompletion: {
      name: "noun-adj-stem-completion",
      description: "Restore nominative suffix -ი for consonant-ending noun/adjective stems",
      rules: stemCompletionRules,
    },
    vowelRestoration: {
      name: "vowel-restoration",
      description: "Restore truncated vowels if applicable",
      rules: vowelRestorationRules,
    },
  },
};
