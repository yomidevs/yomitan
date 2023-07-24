function suffixInflection(inflectedSuffix, deinflectedSuffix, rulesIn, rulesOut){
    return {
        inflected: new RegExp('.*' + inflectedSuffix + '$'), 
        deinflected: deinflectedSuffix,
        uninflect:  (term) =>  term.replace(new RegExp(inflectedSuffix + '$'), deinflectedSuffix),
        rulesIn,
        rulesOut
    }
}

function prefixInflection(inflectedPrefix, deinflectedPrefix, rulesIn, rulesOut){
    return {
        inflected: new RegExp('^' + inflectedPrefix + '.*'), 
        deinflected: deinflectedPrefix,
        uninflect:  (term) =>  term.replace(new RegExp('^' + inflectedPrefix), deinflectedPrefix),
        rulesIn,
        rulesOut
    }
}

function infixInflection(inflectedInfix, deinflectedInfix, rulesIn, rulesOut){
    return {
        inflected: new RegExp('.*' + inflectedInfix + '.*'), 
        deinflected: deinflectedInfix,
        uninflect:  (term) =>  term.replace(new RegExp(inflectedInfix), deinflectedInfix),
        rulesIn,
        rulesOut
    }
}

function wholeWordInflection(inflected, deinflected, rulesIn, rulesOut){
    return {
        inflected: new RegExp('^' + inflected + '$'), 
        deinflected,
        uninflect:  () =>  deinflected,
        rulesIn,
        rulesOut
    }
}