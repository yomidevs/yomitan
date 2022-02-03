/*
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

function requestFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

function getFullscreenElement() {
    return (
        document.fullscreenElement ||
        document.msFullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        null
    );
}

function toggleFullscreen(element) {
    if (getFullscreenElement()) {
        exitFullscreen();
    } else {
        requestFullscreen(element);
    }
}

function setup(container, fullscreenElement=null) {
    const fullscreenLink = container.querySelector('.fullscreen-link');
    if (fullscreenLink !== null) {
        if (fullscreenElement === null) {
            fullscreenElement = container.querySelector('.fullscreen-element');
        }
        fullscreenLink.addEventListener('click', (e) => {
            toggleFullscreen(fullscreenElement);
            e.preventDefault();
            return false;
        }, false);
    }

    const template = container.querySelector('template');
    const templateContentContainer = container.querySelector('.template-content-container');
    if (template !== null && templateContentContainer !== null) {
        const mode = container.dataset.shadowMode;
        const shadow = templateContentContainer.attachShadow({mode});

        const containerStyles = document.querySelector('#container-styles');
        shadow.appendChild(containerStyles.cloneNode(true));

        const content = document.importNode(template.content, true);
        setup(content);
        shadow.appendChild(content);
    }
}
