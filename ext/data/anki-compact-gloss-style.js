/*
 * Copyright (C) 2023-2025  Yomitan Authors
 * Copyright (C) 2019-2022  Yomichan Authors
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

const ANKI_COMPACT_GLOSS_STYLES = `
ul[data-sc-content="glossary"] > li:not(:first-child)::before {
  white-space: pre-wrap;
  content: ' | ';
  display: inline;
  color: #777777;
}

ul[data-sc-content="glossary"] > li {
  display: inline;
}

ul[data-sc-content="glossary"] {
  display: inline;
  list-style: none;
  padding-left: 0;
}
`;

/**
 * @returns {string}
 */
export function getAnkiCompactGlossStyles() {
    return ANKI_COMPACT_GLOSS_STYLES.trim();
}
