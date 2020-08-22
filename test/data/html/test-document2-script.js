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
