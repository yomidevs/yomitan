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

import {createServer} from 'node:http';

/**
 * @param {import('node:http').IncomingMessage} request
 * @returns {Promise<unknown>}
 */
async function readJsonBody(request) {
    const chunks = [];
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const text = Buffer.concat(chunks).toString('utf8');
    if (text.trim().length === 0) {
        return {};
    }
    return JSON.parse(text);
}

/**
 * @param {{
 *   handleRequestBody: (body: unknown) => {result: unknown, error: string|null},
 *   getScenarioState: () => unknown,
 * }} mockState
 * @returns {Promise<{baseUrl: string, ankiConnectUrl: string, close: () => Promise<void>}>}
 */
export async function startAnkiMockHttpServer(mockState) {
    const server = createServer(async (request, response) => {
        const method = String(request.method || 'GET').toUpperCase();
        const requestUrl = String(request.url || '/');
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (method === 'OPTIONS') {
            response.writeHead(204, headers);
            response.end();
            return;
        }

        if (method === 'GET' && requestUrl === '/anki/state') {
            const body = JSON.stringify(mockState.getScenarioState());
            response.writeHead(200, {
                ...headers,
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Length': String(Buffer.byteLength(body)),
            });
            response.end(body);
            return;
        }

        if (method === 'POST' && requestUrl === '/anki') {
            try {
                const requestBody = await readJsonBody(request);
                const {result, error} = mockState.handleRequestBody(requestBody);
                const body = JSON.stringify(error === null ? result : {error});
                response.writeHead(200, {
                    ...headers,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Length': String(Buffer.byteLength(body)),
                });
                response.end(body);
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                const body = JSON.stringify({error: message});
                response.writeHead(200, {
                    ...headers,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Content-Length': String(Buffer.byteLength(body)),
                });
                response.end(body);
            }
            return;
        }

        response.writeHead(404, {
            ...headers,
            'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('Not found');
    });

    const address = /** @type {import('node:net').AddressInfo|null|string} */ (await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            resolve(server.address());
        });
    }));

    if (!(address && typeof address === 'object' && typeof address.port === 'number')) {
        throw new Error('Failed to start Anki mock HTTP server');
    }

    const baseUrl = `http://127.0.0.1:${String(address.port)}`;

    return {
        baseUrl,
        ankiConnectUrl: `${baseUrl}/anki`,
        close: async () => {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(void 0);
                });
            });
        },
    };
}
