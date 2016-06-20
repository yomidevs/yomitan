// Gecko does not currently support chrome.storage.sync, use storage.local instead
// https://bugzilla.mozilla.org/show_bug.cgi?id=1220494
if (!chrome.storage.sync) {
    chrome.storage.sync = chrome.storage.local;
}

// Gecko does not currently support chrome.runtime.onInstalled, just ignore calls to it
// (https://bugzilla.mozilla.org/show_bug.cgi?id=1252871)
if (!chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled = {
        'addListener' : function(){},
        'hasListener' : function(){},
        'removeListener' : function(){}
    };
}