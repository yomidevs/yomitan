function suffixInflection(inflectedSuffix, deinflectedSuffix, rulesIn, rulesOut){
    return {
        inflected: new RegExp('.*' + inflectedSuffix + '$'), 
        uninflect:  (term) =>  term.replace(new RegExp(inflectedSuffix + '$'), deinflectedSuffix),
        rulesIn,
        rulesOut
    }
}

function wholeWordInflection(inflected, deinflected, rulesIn, rulesOut){
    return {
        inflected: new RegExp('^' + inflected + '$'), 
        uninflect:  () =>  deinflected,
        rulesIn,
        rulesOut
    }
}

module.exports = {
    suffixInflection,
    wholeWordInflection
}