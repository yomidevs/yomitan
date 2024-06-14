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

import {EventDispatcher} from './event-dispatcher.js';
import {ExtensionError} from './extension-error.js';

/**
 * This class handles logging of messages to the console and triggering an event for log calls.
 * @augments EventDispatcher<import('log').Events>
 */
class Logger extends EventDispatcher {
    constructor() {
        super();
        /** @type {string} */
        this._extensionName = 'Extension';
        /** @type {?string} */
        this._issueUrl = 'https://github.com/themoeway/yomitan/issues';
    }

    /**
     * @param {string} extensionName
     */
    configure(extensionName) {
        this._extensionName = extensionName;
    }

    /**
     * @param {unknown} message
     * @param {...unknown} optionalParams
     */
    log(message, ...optionalParams) {
        /* eslint-disable no-console */
        console.log(message, ...optionalParams);
        /* eslint-enable no-console */
    }

    /**
     * Logs a warning.
     * @param {unknown} error The error to log. This is typically an `Error` or `Error`-like object.
     */
    warn(error) {
        this.logGenericError(error, 'warn');
    }

    /**
     * Logs an error.
     * @param {unknown} error The error to log. This is typically an `Error` or `Error`-like object.
     */
    error(error) {
        this.logGenericError(error, 'error');
    }

    /**
     * Logs a generic error.
     * @param {unknown} error The error to log. This is typically an `Error` or `Error`-like object.
     * @param {import('log').LogLevel} level
     * @param {import('log').LogContext} [context]
     */
    logGenericError(error, level, context) {
        if (typeof context === 'undefined') {
            context = typeof location === 'undefined' ? {url: 'unknown'} : {url: location.href};
        }

        let errorString;
        try {
            if (typeof error === 'string') {
                errorString = error;
            } else {
                errorString = (
                    typeof error === 'object' && error !== null ?
                    // eslint-disable-next-line @typescript-eslint/no-base-to-string
                    error.toString() :
                    `${error}`
                );
                if (/^\[object \w+\]$/.test(errorString)) {
                    errorString = JSON.stringify(error);
                }
            }
        } catch (e) {
            errorString = `${error}`;
        }

        let errorStack;
        try {
            errorStack = (
                error instanceof Error ?
                (typeof error.stack === 'string' ? error.stack.trimEnd() : '') :
                ''
            );
        } catch (e) {
            errorStack = '';
        }

        let errorData;
        try {
            if (error instanceof ExtensionError) {
                errorData = error.data;
            }
        } catch (e) {
            // NOP
        }

        if (errorStack.startsWith(errorString)) {
            errorString = errorStack;
        } else if (errorStack.length > 0) {
            errorString += `\n${errorStack}`;
        }

        let message = `${this._extensionName} has encountered a problem.`;
        message += `\nOriginating URL: ${context.url}\n`;
        message += errorString;
        if (typeof errorData !== 'undefined') {
            message += `\nData: ${JSON.stringify(errorData, null, 4)}`;
        }
        if (this._issueUrl !== null) {
            message += `\n\nIssues can be reported at ${this._issueUrl}`;
        }

        /* eslint-disable no-console */
        switch (level) {
            case 'log': console.log(message); break;
            case 'warn': console.warn(message); break;
            case 'error': console.error(message); break;
        }
        /* eslint-enable no-console */

        this.trigger('logGenericError', {error, level, context});
    }
}

/**
 * This object is the default logger used by the runtime.
 */
export const log = new Logger();
