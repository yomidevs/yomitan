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
            // latin plurals (e.g. 'indices' -> 'index') (also other languages), 
            // compound nouns (e.g. 'passers-by' -> 'passer-by'), 
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
        '-ing': [
            suffixInflection('ing', '', [], ['Verb']),
            suffixInflection('ing', 'e', [], ['Verb']),
            suffixInflection('ing', 'y', [], ['Verb']),
            suffixInflection('ying', 'ie', [], ['Verb']),
            suffixInflection('nning', 'n', [], ['Verb']),
            suffixInflection('cking', 'c', [], ['Verb']),

            suffixInflection('bbing', 'b', [], ['Verb']),
            suffixInflection('dding', 'd', [], ['Verb']),
            suffixInflection('ffing', 'f', [], ['Verb']),
            suffixInflection('gging', 'g', [], ['Verb']),
            suffixInflection('kking', 'k', [], ['Verb']),
            suffixInflection('lling', 'l', [], ['Verb']),
            suffixInflection('mming', 'm', [], ['Verb']),
            suffixInflection('nning', 'n', [], ['Verb']), // e.g. 'canning'
            suffixInflection('pping', 'p', [], ['Verb']),
            suffixInflection('rring', 'r', [], ['Verb']),
            suffixInflection('ssing', 's', [], ['Verb']),
            suffixInflection('tting', 't', [], ['Verb']),
            suffixInflection('zzing', 'z', [], ['Verb']),
        ],
        // should probably be removed
        'archaic': [
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
        'past': [
            suffixInflection('ed', '', [], ['Verb']), // e.g 'walked'
            suffixInflection('ed', 'e', [], ['Verb']), // e.g. 'hoped'
            suffixInflection('ied', 'y', [], ['Verb']), // e.g. 'tried'

            suffixInflection('laid', 'lay', [], ['Verb']),
            suffixInflection('paid', 'pay', [], ['Verb']),
            suffixInflection('said', 'say', [], ['Verb']),

            suffixInflection('bbed', 'b', [], ['Verb']), // e.g. 'robbed'
            suffixInflection('dded', 'd', [], ['Verb']), // e.g. 'prodded'
            suffixInflection('ffed', 'f', [], ['Verb']), // e.g. ''
            suffixInflection('gged', 'g', [], ['Verb']), // e.g. 'gagged'
            suffixInflection('kked', 'k', [], ['Verb']), // e.g. 'trekked'
            suffixInflection('lled', 'l', [], ['Verb']), // e.g. 'cancelled'
            suffixInflection('mmed', 'm', [], ['Verb']), // e.g. 'trimmed'
            suffixInflection('nned', 'n', [], ['Verb']), // e.g. 'conned'
            suffixInflection('pped', 'p', [], ['Verb']), // e.g. 'slipped'
            suffixInflection('rred', 'r', [], ['Verb']), // e.g. 'marred'
            suffixInflection('ssed', 's', [], ['Verb']), // e.g. 'bussed'
            suffixInflection('tted', 't', [], ['Verb']), // e.g. 'potted'
            suffixInflection('zzed', 'z', [], ['Verb']), // e.g. 'quizzed'
        ],
        'past (irregular)': [
            wholeWordInflection('were', 'are', [], ['Verb']),
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
            suffixInflection('gger', 'g', [], ['Adjective']),
            suffixInflection('tter', 't', [], ['Adjective']),
            suffixInflection('dder', 'd', [], ['Adjective']),
            suffixInflection('nner', 'n', [], ['Adjective']),

            wholeWordInflection('better', 'good', [], ['Adjective']),
            wholeWordInflection('worse', 'bad', [], ['Adjective']),
            wholeWordInflection('farther', 'far', [], ['Adjective']),
            wholeWordInflection('further', 'far', [], ['Adjective']),

        ],
        'superlative': [
            suffixInflection('est', 'e', [], ['Adjective']),
            suffixInflection('est', '', [], ['Adjective']),
            suffixInflection('iest', 'y', [], ['Adjective']),
            suffixInflection('ggest', 'g', [], ['Adjective']),
            suffixInflection('ttest', 't', [], ['Adjective']),
            suffixInflection('ddest', 'd', [], ['Adjective']),
            suffixInflection('nnest', 'n', [], ['Adjective']),

            wholeWordInflection('best', 'good', [], ['Adjective']),
            wholeWordInflection('worst', 'bad', [], ['Adjective']),
            wholeWordInflection('farthest', 'far', [], ['Adjective']),
            wholeWordInflection('furthest', 'far', [], ['Adjective']),
        ],
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

