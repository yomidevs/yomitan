/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

/**
 * Creates a promise that will resolve after the next animation frame, using `requestAnimationFrame`.
 * @param {number} [timeout] A maximum duration (in milliseconds) to wait until the promise resolves. If null or omitted, no timeout is used.
 * @returns {Promise<{time: number, timeout: boolean}>} A promise that is resolved with `{time, timeout}`, where `time` is the timestamp from `requestAnimationFrame`,
 *   and `timeout` is a boolean indicating whether the cause was a timeout or not.
 * @throws The promise throws an error if animation is not supported in this context, such as in a service worker.
 */
export function promiseAnimationFrame(timeout) {
    return new Promise((resolve, reject) => {
        if (typeof cancelAnimationFrame !== 'function' || typeof requestAnimationFrame !== 'function') {
            reject(new Error('Animation not supported in this context'));
            return;
        }

        /** @type {?import('core').Timeout} */
        let timer = null;
        /** @type {?number} */
        let frameRequest = null;
        /**
         * @param {number} time
         */
        const onFrame = (time) => {
            frameRequest = null;
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
            resolve({time, timeout: false});
        };
        const onTimeout = () => {
            timer = null;
            if (frameRequest !== null) {
                cancelAnimationFrame(frameRequest);
                frameRequest = null;
            }
            resolve({time: performance.now(), timeout: true});
        };

        frameRequest = requestAnimationFrame(onFrame);
        if (typeof timeout === 'number') {
            timer = setTimeout(onTimeout, timeout);
        }
    });
}
