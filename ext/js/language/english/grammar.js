async function deinflectionReasonsEn (){
    const reasons = {
        'plural': [
            // regular and near-regular plurals
            suffixInflection('s', '', ['Noun'], ['Noun']),
            suffixInflection('es', '', ['Noun'], ['Noun']),
            suffixInflection('ies', 'y', ['Noun'], ['Noun']),
            suffixInflection('ves', 'fe', ['Noun'], ['Noun']),
            suffixInflection('ves', 'f', ['Noun'], ['Noun']),

            // irregular plurals (-en)
            suffixInflection('children', 'child', ['Noun'], ['Noun']),
            suffixInflection('oxen', 'ox', ['Noun'], ['Noun']),
            
            // irregular plurals (apophonic plurals)
            suffixInflection('feet', 'foot', ['Noun'], ['Noun']),
            suffixInflection('geese', 'goose', ['Noun'], ['Noun']),
            suffixInflection('lice', 'louse', ['Noun'], ['Noun']),
            suffixInflection('mice', 'mouse', ['Noun'], ['Noun']),
            suffixInflection('men', 'man', ['Noun'], ['Noun']),
            suffixInflection('teeth', 'tooth', ['Noun'], ['Noun']),

            // incomplete: 
            // latin plurals ('indices' -> 'index') (also other languages), 
            // compound nouns ('passers-by' -> 'passer-by'), 
            // ...
        ],
        'possessive': [
            suffixInflection('\'s', '', ['Noun'], ['Noun']),
            suffixInflection('s\'', 's', ['Noun'], ['Noun']),

            wholeWordInflection('my', 'I', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('your', 'you', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('his', 'he', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('her', 'she', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('its', 'it', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('our', 'we', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('their', 'they', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('whose', 'who', ['Pronoun'], ['Pronoun']),
        ],
        'accusative': [
            wholeWordInflection('me', 'I', ['Pronoun'], ['Pronoun']), 
            wholeWordInflection('him', 'he', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('her', 'she', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('us', 'we', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('them', 'they', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('thee', 'thou', ['Pronoun'], ['Pronoun']),
        ],
        'past': [
            suffixInflection('ed', '', [], ['Verb']), // 'walked'
            suffixInflection('ed', 'e', [], ['Verb']), // 'hoped'
            suffixInflection('ied', 'y', [], ['Verb']), // 'tried'
            suffixInflection('cked', 'c', [], ['Verb']), // 'frolicked'

            suffixInflection('laid', 'lay', [], ['Verb']),
            suffixInflection('paid', 'pay', [], ['Verb']),
            suffixInflection('said', 'say', [], ['Verb']),

            ...doubledConsonantInflection('bdgklmnprstz', 'ed', [], ['Verb']),
        ],
        'past (irregular)': [
            wholeWordInflection('were', 'are', [], ['Verb']),
        ],
        '-ing': [
            suffixInflection('ing', '', [], ['Verb']),
            suffixInflection('ing', 'e', [], ['Verb']), // 'driving', but false positive singe for 'singing'
            suffixInflection('ing', 'y', [], ['Verb']),
            suffixInflection('ying', 'ie', [], ['Verb']),
            suffixInflection('cking', 'c', [], ['Verb']), // 'frolicking'

            ...doubledConsonantInflection('bdgklmnprstz', 'ing', [], ['Verb']),
        ],
        'archaic': [ // should probably be removed
            wholeWordInflection('thou', 'you', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('thy', 'your', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('thine', 'your', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('ye', 'you', ['Pronoun'], ['Pronoun']),
            wholeWordInflection('thyself', 'yourself', ['Pronoun'], ['Pronoun']),
        ],
        '1st person singular': [
            wholeWordInflection('am', 'be', ['Verb'], ['Verb']),
        ],
        '3rd person singular': [
            suffixInflection('s', '', ['Verb'], ['Verb']),
            suffixInflection('es', '', ['Verb'], ['Verb']),
            suffixInflection('ies', 'y', ['Verb'], ['Verb']),
            wholeWordInflection('is', 'be', ['Verb'], ['Verb']),
            wholeWordInflection('has', 'have', ['Verb'], ['Verb']),
        ],
        'participle': [],
        'contraction': [    
            wholeWordInflection('\'m', 'am', [], ['Verb']),
            wholeWordInflection('\'re', 'are', [], ['Verb']),
            wholeWordInflection('\'ve', 'have', [], ['Verb']),
            wholeWordInflection('\'ll', 'will', [], ['Verb']),
            wholeWordInflection('\'d', 'would', [], ['Verb']),
            wholeWordInflection('\'d', 'had', [], ['Verb']),
            wholeWordInflection('\'d', 'did', [], ['Verb']),
            wholeWordInflection('\'s', 'is', [], ['Verb']),
            wholeWordInflection('\'s', 'has', [], ['Verb']),
            wholeWordInflection('\'em', 'them', [], ['Pronoun']),
        ],
        'adverb': [
            suffixInflection('ly', '', [], ['Adjective']),
        ],
        'comparative': [
            suffixInflection('er', 'e', [], ['Adjective']),
            suffixInflection('er', '', [], ['Adjective']),
            suffixInflection('ier', 'y', [], ['Adjective']),
            
            ...doubledConsonantInflection('bdgmnt', 'er', [], ['Adjective']),

            wholeWordInflection('better', 'good', [], ['Adjective']),
            wholeWordInflection('worse', 'bad', [], ['Adjective']),
            wholeWordInflection('farther', 'far', [], ['Adjective']),
            wholeWordInflection('further', 'far', [], ['Adjective']),

        ],
        'superlative': [
            suffixInflection('est', 'e', [], ['Adjective']),
            suffixInflection('est', '', [], ['Adjective']),
            suffixInflection('iest', 'y', [], ['Adjective']),
            
            ...doubledConsonantInflection('bdgmnt', 'est', [], ['Adjective']),


            wholeWordInflection('best', 'good', [], ['Adjective']),
            wholeWordInflection('worst', 'bad', [], ['Adjective']),
            wholeWordInflection('farthest', 'far', [], ['Adjective']),
            wholeWordInflection('furthest', 'far', [], ['Adjective']),
        ],
        'dropped g': [
            suffixInflection('in\'', 'ing', [], ['Verb']),
        ],
        '-y': [
            suffixInflection('y', '', [], ['Noun', 'Verb']), // dirty
            ...doubledConsonantInflection('glmnprst', 'y', [], ['Noun', 'Verb']),
        ]
    }

    const irregularVerbs = JSON.parse(await fetchAsset('/js/language/english/irregular-verbs.json'))
    for ( const [verb, inflections] of Object.entries(irregularVerbs)){
        for ( const [past, participle] of inflections){
            if(past !== verb)reasons['past (irregular)'].push(suffixInflection(past, verb, ['Verb'], ['Verb']))
            if(participle !== verb) reasons['participle'].push(suffixInflection(participle, verb, ['Verb'], ['Verb']))
        }
    }
    
    return reasons
}

function doubledConsonantInflection(consonants, suffix, inTypes, outTypes){
    return consonants.split('').map(consonant => suffixInflection(`${consonant}${consonant}${suffix}`, consonant, inTypes, outTypes))
}

