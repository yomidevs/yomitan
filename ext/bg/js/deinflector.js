/*
 * Copyright (C) 2016-2017  Alex Yatskov <alex@foosoft.net>
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


class Deinflector {
    constructor(reasons) {
        this.reasons = reasons;
    }

    deinflect(source) {
        const results = [{
            source,
            term: source,
            rules: [],
            definitions: [],
            reasons: []
        }];
        for (let i = 0; i < results.length; ++i) {
            const entry = results[i];

            for (const reason in this.reasons) {
                for (const variant of this.reasons[reason]) {
                    let accept = entry.rules.length === 0;
                    if (!accept) {
                        for (const rule of entry.rules) {
                            if (variant.rulesIn.includes(rule)) {
                                accept = true;
                                break;
                            }
                        }
                    }

                    if (!accept || !entry.term.endsWith(variant.kanaIn)) {
                        continue;
                    }

                    const term = entry.term.slice(0, -variant.kanaIn.length) + variant.kanaOut;
                    if (term.length === 0) {
                        continue;
                    }

                    results.push({
                        source,
                        term,
                        rules: variant.rulesOut,
                        definitions: [],
                        reasons: [reason, ...entry.reasons]
                    });
                }
            }
        }
        return results;
    }
}
