/*
 * Copyright (C) 2024-2026  Yomitan Authors
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

/**
 * Theme registry — single source of truth for available theme modes.
 * Adding a theme: add entry here, create CSS file, add to settings enum.
 */
export const themes = [
    {
        id: 'classic',
        label: 'Classic',
        css: null, /* base CSS is classic; no override file needed */
    },
    {
        id: 'minimal',
        label: 'Minimal',
        css: '/css/theme-minimal.css',
    },
    {
        id: 'eink',
        label: 'E-Ink',
        css: '/css/theme-eink.css',
    },
];

/**
 * @param {string} themeId
 * @returns {{id: string, label: string, css: string | null} | undefined}
 */
export function getThemeById(themeId) {
    return themes.find((t) => t.id === themeId);
}
