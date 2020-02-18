const fs = require('fs');
const path = require('path');


let JSZip = null;

function requireScript(fileName, exportNames, variables) {
    const absoluteFileName = path.join(__dirname, '..', fileName);
    const source = fs.readFileSync(absoluteFileName, {encoding: 'utf8'});
    const exportNamesString = Array.isArray(exportNames) ? exportNames.join(',') : '';
    const variablesArgumentName = '__variables__';
    let variableString = '';
    if (typeof variables === 'object' && variables !== null) {
        variableString = Object.keys(variables).join(',');
        variableString = `const {${variableString}} = ${variablesArgumentName};`;
    }
    return Function(variablesArgumentName, `'use strict';${variableString}${source}\n;return {${exportNamesString}};`)(variables);
}

function getJSZip() {
    if (JSZip === null) {
        process.noDeprecation = true; // Suppress a warning about JSZip
        JSZip = require(path.join(__dirname, '../ext/mixed/lib/jszip.min.js'));
        process.noDeprecation = false;
    }
    return JSZip;
}


module.exports = {
    requireScript,
    get JSZip() { return getJSZip(); }
};
