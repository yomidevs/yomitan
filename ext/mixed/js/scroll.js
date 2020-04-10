/*
 * Copyright (C) 2019-2020  Yomichan Authors
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


class WindowScroll {
    constructor() {
        this.animationRequestId = null;
        this.animationStartTime = 0;
        this.animationStartX = 0;
        this.animationStartY = 0;
        this.animationEndTime = 0;
        this.animationEndX = 0;
        this.animationEndY = 0;
        this.requestAnimationFrameCallback = this.onAnimationFrame.bind(this);
    }

    toY(y) {
        this.to(this.x, y);
    }

    toX(x) {
        this.to(x, this.y);
    }

    to(x, y) {
        this.stop();
        window.scroll(x, y);
    }

    animate(x, y, time) {
        this.animationStartX = this.x;
        this.animationStartY = this.y;
        this.animationStartTime = window.performance.now();
        this.animationEndX = x;
        this.animationEndY = y;
        this.animationEndTime = this.animationStartTime + time;
        this.animationRequestId = window.requestAnimationFrame(this.requestAnimationFrameCallback);
    }

    stop() {
        if (this.animationRequestId === null) {
            return;
        }

        window.cancelAnimationFrame(this.animationRequestId);
        this.animationRequestId = null;
    }

    onAnimationFrame(time) {
        if (time >= this.animationEndTime) {
            window.scroll(this.animationEndX, this.animationEndY);
            this.animationRequestId = null;
            return;
        }

        const t = WindowScroll.easeInOutCubic((time - this.animationStartTime) / (this.animationEndTime - this.animationStartTime));
        window.scroll(
            WindowScroll.lerp(this.animationStartX, this.animationEndX, t),
            WindowScroll.lerp(this.animationStartY, this.animationEndY, t)
        );

        this.animationRequestId = window.requestAnimationFrame(this.requestAnimationFrameCallback);
    }

    get x() {
        return window.scrollX || window.pageXOffset;
    }

    get y() {
        return window.scrollY || window.pageYOffset;
    }

    static easeInOutCubic(t) {
        if (t < 0.5) {
            return (4.0 * t * t * t);
        } else {
            t = 1.0 - t;
            return 1.0 - (4.0 * t * t * t);
        }
    }

    static lerp(start, end, percent) {
        return (end - start) * percent + start;
    }
}
