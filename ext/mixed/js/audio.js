/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


function audioGetFromUrl(url) {
    return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.addEventListener('loadeddata', () => {
            if (audio.duration === 5.694694 || audio.duration === 5.720718) {
                // Hardcoded values for invalid audio
                reject(new Error('Could not retrieve audio'));
            } else {
                resolve(audio);
            }
        });
        audio.addEventListener('error', () => reject(audio.error));
    });
}

async function audioGetFromSources(expression, sources, optionsContext, createAudioObject, cache=null) {
    const key = `${expression.expression}:${expression.reading}`;
    if (cache !== null && cache.hasOwnProperty(expression)) {
        return cache[key];
    }

    for (let i = 0, ii = sources.length; i < ii; ++i) {
        const source = sources[i];
        const url = await apiAudioGetUrl(expression, source, optionsContext);
        if (url === null) {
            continue;
        }

        try {
            const audio = createAudioObject ? await audioGetFromUrl(url) : null;
            const result = {audio, url, source};
            if (cache !== null) {
                cache[key] = result;
            }
            return result;
        } catch (e) {
            // NOP
        }
    }
    return {audio: null, source: null};
}

function audioGetTextToSpeechVoice(voiceURI) {
    try {
        for (const voice of speechSynthesis.getVoices()) {
            if (voice.voiceURI === voiceURI) {
                return voice;
            }
        }
    } catch (e) {
        // NOP
    }
    return null;
}
