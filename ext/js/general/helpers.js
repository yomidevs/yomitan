async function fetchAsset(url, json=false) {
    if (typeof window === 'undefined') {
        const fs = require('fs');
        const path = require('path');

        return fs.readFileSync(path.resolve(__dirname + '/../ext' + url), 'utf8')
    }
    else {
        url = chrome.runtime.getURL(url);
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'default',
            credentials: 'omit',
            redirect: 'follow',
            referrerPolicy: 'no-referrer'
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        return await (json ? response.json() : response.text());
    }
}