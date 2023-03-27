async function fetchAsset(url, json=false) {
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