// @ts-check
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


/**
 * @param {string} word
 * @returns {boolean}
 */
function endsWithVowelExceptI(word) {
  return /[აეოუუ]$/.test(word);
}




export const georgianTransforms = {
  language: "kat",
  conditions: {},
  transforms: {
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
