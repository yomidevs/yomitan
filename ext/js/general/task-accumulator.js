/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

class TaskAccumulator {
    constructor(runTasks) {
        this._deferPromise = null;
        this._activePromise = null;
        this._tasks = [];
        this._tasksActive = [];
        this._uniqueTasks = new Map();
        this._uniqueTasksActive = new Map();
        this._runTasksBind = this._runTasks.bind(this);
        this._tasksCompleteBind = this._tasksComplete.bind(this);
        this._runTasks = runTasks;
    }

    enqueue(key, data) {
        if (this._deferPromise === null) {
            const promise = this._activePromise !== null ? this._activePromise : Promise.resolve();
            this._deferPromise = promise.then(this._runTasksBind);
        }

        const task = {data, stale: false};
        if (key !== null) {
            const activeTaskInfo = this._uniqueTasksActive.get(key);
            if (typeof activeTaskInfo !== 'undefined') {
                activeTaskInfo.stale = true;
            }

            this._uniqueTasks.set(key, task);
        } else {
            this._tasks.push(task);
        }

        return this._deferPromise;
    }

    _runTasks() {
        this._deferPromise = null;

        // Swap
        [this._tasks, this._tasksActive] = [this._tasksActive, this._tasks];
        [this._uniqueTasks, this._uniqueTasksActive] = [this._uniqueTasksActive, this._uniqueTasks];

        const promise = this._runTasksAsync();
        this._activePromise = promise.then(this._tasksCompleteBind);
        return this._activePromise;
    }

    async _runTasksAsync() {
        try {
            const allTasks = [
                ...this._tasksActive.map((taskInfo) => [null, taskInfo]),
                ...this._uniqueTasksActive.entries()
            ];
            await this._runTasks(allTasks);
        } catch (e) {
            log.error(e);
        }
    }

    _tasksComplete() {
        this._tasksActive.length = 0;
        this._uniqueTasksActive.clear();
        this._activePromise = null;
    }
}
