import {LanguageTransformer} from "../../ext/js/language/language-transformer.js";
import {tagalogTransforms} from "../../ext/js/language/tl/tagalog-transforms.js";

const consonants = 'bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ';
const VOWELS = 'aeiou';
const inflectedSuffix = 'in';
const regex = new RegExp(`^(${'pan'})([${consonants}]*[${VOWELS}][${consonants}]*)(\\2)`);

const languageTransformer = new LanguageTransformer();
languageTransformer.addDescriptor(tagalogTransforms);

console.log(regex.test('panganganak'))
console.log('panganganak'.replace(regex, ``))
console.log(JSON.stringify(languageTransformer.transform('panganganak'), null, 2));