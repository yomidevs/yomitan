async function deinflectionReasonsEn (){
    const reasons = {
        'plural': [
            // regular and near-regular plurals
            suffixInflection('s', '', ['n'], ['n']),
            suffixInflection('es', '', ['n'], ['n']),
            suffixInflection('ies', 'y', ['n'], ['n']),
            suffixInflection('ves', 'fe', ['n'], ['n']),
            suffixInflection('ves', 'f', ['n'], ['n']),

            // irregular plurals (-en)
            suffixInflection('children', 'child', ['n'], ['n']),
            suffixInflection('oxen', 'ox', ['n'], ['n']),
            
            // irregular plurals (apophonic plurals)
            suffixInflection('feet', 'foot', ['n'], ['n']),
            suffixInflection('geese', 'goose', ['n'], ['n']),
            suffixInflection('lice', 'louse', ['n'], ['n']),
            suffixInflection('mice', 'mouse', ['n'], ['n']),
            suffixInflection('men', 'man', ['n'], ['n']),
            suffixInflection('teeth', 'tooth', ['n'], ['n']),

            // incomplete: 
            // latin plurals ('indices' -> 'index') (also other languages), 
            // compound nouns ('passers-by' -> 'passer-by'), 
            // ...
        ],
        'possessive': [
            suffixInflection('\'s', '', ['n'], ['n']),
            suffixInflection('s\'', 's', ['n'], ['n']),

            wholeWordInflection('my', 'I', ['pn'], ['pn']),
            wholeWordInflection('your', 'you', ['pn'], ['pn']),
            wholeWordInflection('his', 'he', ['pn'], ['pn']),
            wholeWordInflection('her', 'she', ['pn'], ['pn']),
            wholeWordInflection('its', 'it', ['pn'], ['pn']),
            wholeWordInflection('our', 'we', ['pn'], ['pn']),
            wholeWordInflection('their', 'they', ['pn'], ['pn']),
            wholeWordInflection('whose', 'who', ['pn'], ['pn']),
        ],
        'accusative': [
            wholeWordInflection('me', 'I', ['pn'], ['pn']), 
            wholeWordInflection('him', 'he', ['pn'], ['pn']),
            wholeWordInflection('her', 'she', ['pn'], ['pn']),
            wholeWordInflection('us', 'we', ['pn'], ['pn']),
            wholeWordInflection('them', 'they', ['pn'], ['pn']),
            wholeWordInflection('thee', 'thou', ['pn'], ['pn']),
        ],
        'past': [
            suffixInflection('ed', '', [], ['v']), // 'walked'
            suffixInflection('ed', 'e', [], ['v']), // 'hoped'
            suffixInflection('ied', 'y', [], ['v']), // 'tried'
            suffixInflection('cked', 'c', [], ['v']), // 'frolicked'

            suffixInflection('laid', 'lay', [], ['v']),
            suffixInflection('paid', 'pay', [], ['v']),
            suffixInflection('said', 'say', [], ['v']),

            ...doubledConsonantInflection('bdgklmnprstz', 'ed', [], ['v']),
        ],
        'past (irregular)': [
            prefixInflection('was', 'am', [], ['v']),
            prefixInflection('was', 'is', [], ['v']),
            prefixInflection('were', 'are', [], ['v']),
            prefixInflection('could', 'can', [], ['v']),

            ...(await irregularVerbs())['past'],
        ],
        '-ing': [
            suffixInflection('ing', '', [], ['v']),
            suffixInflection('ing', 'e', [], ['v']), // 'driving', but false positive singe for 'singing'
            suffixInflection('ing', 'y', [], ['v']),
            suffixInflection('ying', 'ie', [], ['v']),
            suffixInflection('cking', 'c', [], ['v']), // 'frolicking'

            ...doubledConsonantInflection('bdgklmnprstz', 'ing', [], ['v']),
        ],
        'archaic': [ // should probably be removed
            wholeWordInflection('thou', 'you', ['pn'], ['pn']),
            wholeWordInflection('thy', 'your', ['pn'], ['pn']),
            wholeWordInflection('thine', 'your', ['pn'], ['pn']),
            wholeWordInflection('ye', 'you', ['pn'], ['pn']),
            wholeWordInflection('thyself', 'yourself', ['pn'], ['pn']),
        ],
        '1st person singular': [
            wholeWordInflection('am', 'be', ['v'], ['v']),
        ],
        '3rd person singular': [
            suffixInflection('s', '', ['v'], ['v']),
            suffixInflection('es', '', ['v'], ['v']),
            suffixInflection('ies', 'y', ['v'], ['v']),
            wholeWordInflection('is', 'be', ['v'], ['v']),
            wholeWordInflection('has', 'have', ['v'], ['v']),
        ],
        'participle': [
            ...(await irregularVerbs())['participle'],
        ],
        'contraction': [    
            wholeWordInflection('\'m', 'am', [], ['v']),
            wholeWordInflection('\'re', 'are', [], ['v']),
            wholeWordInflection('\'ve', 'have', [], ['v']),
            prefixInflection('\'ll', 'will', [], ['v']),
            wholeWordInflection('\'d', 'would', [], ['v']),
            wholeWordInflection('\'d', 'had', [], ['v']),
            wholeWordInflection('\'d', 'did', [], ['v']),
            wholeWordInflection('\'s', 'is', [], ['v']),
            wholeWordInflection('\'s', 'has', [], ['v']),
            wholeWordInflection('\'em', 'them', [], ['pn']),
            prefixInflection('gonna', 'going to', [], ['pn']),
            prefixInflection('won\'t', 'will not', [], []),
            prefixInflection('whatcha', 'what are you', [], []),
            wholeWordInflection('c\'mon', 'come on', [], []),
            wholeWordInflection('gimme', 'give me', [], []),
            wholeWordInflection('gotta', 'got to', [], []),
            wholeWordInflection('lemme', 'let me', [], []),
            wholeWordInflection('wanna', 'want to', [], []),
            prefixInflection('don\'t', 'do not', [], []),
        ],
        'adverb': [
            suffixInflection('ly', '', [], ['adj']),
        ],
        'comparative': [
            suffixInflection('er', 'e', [], ['adj']),
            suffixInflection('er', '', [], ['adj']),
            suffixInflection('ier', 'y', [], ['adj']),
            
            ...doubledConsonantInflection('bdgmnt', 'er', [], ['adj']),

            wholeWordInflection('better', 'good', [], ['adj']),
            wholeWordInflection('worse', 'bad', [], ['adj']),
            wholeWordInflection('farther', 'far', [], ['adj']),
            wholeWordInflection('further', 'far', [], ['adj']),

        ],
        'superlative': [
            suffixInflection('est', 'e', [], ['adj']),
            suffixInflection('est', '', [], ['adj']),
            suffixInflection('iest', 'y', [], ['adj']),
            
            ...doubledConsonantInflection('bdgmnt', 'est', [], ['adj']),

            wholeWordInflection('best', 'good', [], ['adj']),
            wholeWordInflection('worst', 'bad', [], ['adj']),
            wholeWordInflection('farthest', 'far', [], ['adj']),
            wholeWordInflection('furthest', 'far', [], ['adj']),
        ],
        'dropped g': [
            suffixInflection('in\'', 'ing', [], ['v']),
        ],
        '-y': [
            suffixInflection('y', '', [], ['n', 'v']), // dirty
            ...doubledConsonantInflection('glmnprst', 'y', [], ['n', 'v']),
        ],
        'un-': [
            prefixInflection('un', '', [], ['adj', 'v']),
        ],
        'going-to future': [
            prefixInflection('going to ', '', [], ['v']),
        ],
        'will future': [
            prefixInflection('will ', '', [], ['v']),
        ],
        'negative': [
            prefixInflection('will not ', 'will ', [], []),
        ],
        'negative imperative': [
            prefixInflection('do not ', '', [], []),
        ],
    }

    return reasons
}

function doubledConsonantInflection(consonants, suffix, inTypes, outTypes){
    return consonants.split('').map(consonant => suffixInflection(`${consonant}${consonant}${suffix}`, consonant, inTypes, outTypes))
}

async function irregularVerbs(){
    verbs = {
        'past': [],
        'participle': [],
    }

    const irregularVerbs = JSON.parse(await fetchAsset('/js/language/english/irregular-verbs.json'))
    for ( const [verb, inflections] of Object.entries(irregularVerbs)){
        for ( const [past, participle] of inflections){
            if(past !== verb) verbs['past'].push(suffixInflection(past, verb, ['v'], ['v']))
            if(participle !== verb) verbs['participle'].push(suffixInflection(participle, verb, ['v'], ['v']))
        }
    }

    return verbs
}

