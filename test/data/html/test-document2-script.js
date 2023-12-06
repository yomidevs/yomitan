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

/**
 * @param {Element} element
 */
function requestFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
        // @ts-expect-error - Browser compatibility
    } else if (element.mozRequestFullScreen) {
        // @ts-expect-error - Browser compatibility
        element.mozRequestFullScreen();
        // @ts-expect-error - Browser compatibility
    } else if (element.webkitRequestFullscreen) {
        // @ts-expect-error - Browser compatibility
        element.webkitRequestFullscreen();
        // @ts-expect-error - Browser compatibility
    } else if (element.msRequestFullscreen) {
        // @ts-expect-error - Browser compatibility
        element.msRequestFullscreen();
    }
}

/** */
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
        // @ts-expect-error - Browser compatibility
    } else if (document.mozCancelFullScreen) {
        // @ts-expect-error - Browser compatibility
        document.mozCancelFullScreen();
        // @ts-expect-error - Browser compatibility
    } else if (document.webkitExitFullscreen) {
        // @ts-expect-error - Browser compatibility
        document.webkitExitFullscreen();
        // @ts-expect-error - Browser compatibility
    } else if (document.msExitFullscreen) {
        // @ts-expect-error - Browser compatibility
        document.msExitFullscreen();
    }
}

/**
 * @returns {?Element}
 */
function getFullscreenElement() {
    return (
        document.fullscreenElement ||
        // @ts-expect-error - Browser compatibility
        document.msFullscreenElement ||
        // @ts-expect-error - Browser compatibility
        document.mozFullScreenElement ||
        // @ts-expect-error - Browser compatibility
        document.webkitFullscreenElement ||
        null
    );
}

/**
 * @param {Element} element
 */
function toggleFullscreen(element) {
    if (getFullscreenElement()) {
        exitFullscreen();
    } else {
        requestFullscreen(element);
    }
}

/**
 * @param {HTMLElement|DocumentFragment} container
 * @param {?Element} [fullscreenElement]
 */
function setup(container, fullscreenElement=null) {
    const fullscreenLink = container.querySelector('.fullscreen-link');
    if (fullscreenLink !== null) {
        if (fullscreenElement === null) {
            fullscreenElement = container.querySelector('.fullscreen-element');
        }
        fullscreenLink.addEventListener('click', (e) => {
            if (fullscreenElement === null) { return; }
            toggleFullscreen(fullscreenElement);
            e.preventDefault();
            return false;
        }, false);
    }

    const template = container.querySelector('template');
    const templateContentContainer = container.querySelector('.template-content-container');
    if (template !== null && templateContentContainer !== null) {
        const mode = (container instanceof HTMLElement ? container.dataset.shadowMode : void 0);
        const shadow = templateContentContainer.attachShadow({
            mode: (mode === 'open' || mode === 'closed' ? mode : 'open')
        });

        const containerStyles = document.querySelector('#container-styles');
        if (containerStyles !== null) {
            shadow.appendChild(containerStyles.cloneNode(true));
        }

        const content = document.importNode(template.content, true);
        setup(content);
        shadow.appendChild(content);
    }
}
