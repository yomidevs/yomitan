/*
 * Copyright (C) 2023-2025  Yomitan Authors
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

import {access, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function exists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * @param {{chromiumReportPath: string, edgeReportPath?: string, firefoxReportPath: string, outputPath: string}} options
 * @returns {Promise<void>}
 */
export async function writeCombinedTabbedReport(options) {
    const {chromiumReportPath, edgeReportPath, firefoxReportPath, outputPath} = options;
    const hasChromium = await exists(chromiumReportPath);
    const hasEdge = typeof edgeReportPath === 'string' && edgeReportPath.length > 0 ? await exists(edgeReportPath) : false;
    const hasFirefox = await exists(firefoxReportPath);
    const tabs = [];
    if (hasChromium) {
        tabs.push({
            id: 'chromium',
            label: 'Chromium',
            src: path.basename(chromiumReportPath),
        });
    }
    if (hasEdge) {
        tabs.push({
            id: 'edge',
            label: 'Edge',
            src: path.basename(edgeReportPath),
        });
    }
    if (hasFirefox) {
        tabs.push({
            id: 'firefox',
            label: 'Firefox',
            src: path.basename(firefoxReportPath),
        });
    }
    if (tabs.length === 0) {
        return;
    }
    const defaultTabId = tabs.some((tab) => tab.id === 'chromium') ? 'chromium' : tabs[0].id;
    const tabButtons = tabs.map((tab) => `<button class="tab-button" data-tab-id="${escapeHtml(tab.id)}">${escapeHtml(tab.label)}</button>`).join('');
    const panes = tabs.map((tab) => `<section class="tab-pane" data-tab-pane="${escapeHtml(tab.id)}"><iframe src="${escapeHtml(tab.src)}" title="${escapeHtml(tab.label)} report"></iframe></section>`).join('');

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Manabitan Extension E2E Reports</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; color: #1d1d1f; background: #f3f4f6; }
    .header { padding: 12px 16px; border-bottom: 1px solid #d1d5db; background: white; position: sticky; top: 0; z-index: 2; }
    .tabs { display: flex; gap: 8px; }
    .tab-button { border: 1px solid #d1d5db; background: #fff; border-radius: 8px; padding: 6px 12px; font-weight: 600; cursor: pointer; }
    .tab-button.active { background: #2563eb; color: white; border-color: #2563eb; }
    .content { height: calc(100vh - 61px); }
    .tab-pane { display: none; height: 100%; }
    .tab-pane.active { display: block; }
    iframe { width: 100%; height: 100%; border: 0; background: white; }
  </style>
</head>
<body>
  <header class="header">
    <div class="tabs">${tabButtons}</div>
  </header>
  <main class="content">${panes}</main>
  <script>
    const defaultTabId = ${JSON.stringify(defaultTabId)};
    const buttons = Array.from(document.querySelectorAll('.tab-button'));
    const panes = Array.from(document.querySelectorAll('.tab-pane'));
    const activate = (tabId) => {
      for (const button of buttons) {
        button.classList.toggle('active', button.dataset.tabId === tabId);
      }
      for (const pane of panes) {
        pane.classList.toggle('active', pane.dataset.tabPane === tabId);
      }
    };
    for (const button of buttons) {
      button.addEventListener('click', () => activate(button.dataset.tabId));
    }
    activate(defaultTabId);
  </script>
</body>
</html>`;

    await mkdir(path.dirname(outputPath), {recursive: true});
    await writeFile(outputPath, html, 'utf8');
}
