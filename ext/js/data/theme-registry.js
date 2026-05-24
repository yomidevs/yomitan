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
