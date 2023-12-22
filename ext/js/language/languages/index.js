/*
 * Copyright (C) 2023  Yomitan Authors
 * Copyright (C) 2021-2022  Yomichan Authors
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// German
import {getDeinflectionReasons as getDeinflectionReasonsDE} from './de/grammar.js';
import {textTransformations as textTransformationsDE} from './de/textTransformations.js';

// English
import {getDeinflectionReasons as getDeinflectionReasonsEN} from './en/grammar.js';
import {textTransformations as textTransformationsEN} from './en/textTransformations.js';

// Albanian
import {getDeinflectionReasons as getDeinflectionReasonsSQ} from './sq/grammar.js';
import {textTransformations as textTransformationsSQ} from './sq/textTransformations.js';

// Arabic
import {textTransformations as textTransformationsAR} from './ar/textTransformations.js';

// Ancient Greek

// French
import {textTransformations as textTransformationsFR} from './fr/textTransformations.js';

// Greek
import {textTransformations as textTransformationsEL} from './el/textTransformations.js';

// Indonesian
import {textTransformations as textTransformationsID} from './id/textTransformations.js';

// Italian
import {textTransformations as textTransformationsIT} from './it/textTransformations.js';

// Japanese
import {getDeinflectionReasons as getDeinflectionReasonsJA} from './ja/grammar.js';
import {textTransformations as textTransformationsJA} from './ja/textTransformations.js';

// Latin
import {textTransformations as textTransformationsLA} from './la/textTransformations.js';

// Persian

// Portuguese
import {textTransformations as textTransformationsPT} from './pt/textTransformations.js';

// Russian
import {getDeinflectionReasons as getDeinflectionReasonsRU} from './ru/grammar.js';
import {textTransformations as textTransformationsRU} from './ru/textTransformations.js';

// Serbo-Croatian
import {textTransformations as textTransformationsSH} from './sh/textTransformations.js';

// Spanish
import {textTransformations as textTransformationsES} from './es/textTransformations.js';

export const languages = {
    'de': {
        getDeinflectionReasons: getDeinflectionReasonsDE,
        textTransformations: textTransformationsDE
    },
    'en': {
        getDeinflectionReasons: getDeinflectionReasonsEN,
        textTransformations: textTransformationsEN
    },
    'sq': {
        getDeinflectionReasons: getDeinflectionReasonsSQ,
        textTransformations: textTransformationsSQ
    },
    'ar': {
        textTransformations: textTransformationsAR
    },
    'grc': {
        // Adjust as needed...
    },
    'fr': {
        textTransformations: textTransformationsFR
    },
    'el': {
        textTransformations: textTransformationsEL
    },
    'id': {
        textTransformations: textTransformationsID
    },
    'it': {
        textTransformations: textTransformationsIT
    },
    'ja': {
        getDeinflectionReasons: getDeinflectionReasonsJA,
        textTransformations: textTransformationsJA
    },
    'la': {
        textTransformations: textTransformationsLA
    },
    'fa': {
        // Adjust as needed...
    },
    'pt': {
        textTransformations: textTransformationsPT
    },
    'ru': {
        getDeinflectionReasons: getDeinflectionReasonsRU,
        textTransformations: textTransformationsRU
    },
    'sh': {
        textTransformations: textTransformationsSH
    },
    'es': {
        textTransformations: textTransformationsES
    }
};
