/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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


class PageExitPrevention {
  constructor() {
  }

  start() {
      PageExitPrevention._addInstance(this);
  }

  end() {
      PageExitPrevention._removeInstance(this);
  }

  static _addInstance(instance) {
      const size = PageExitPrevention._instances.size;
      PageExitPrevention._instances.set(instance, true);
      if (size === 0) {
          window.addEventListener('beforeunload', PageExitPrevention._onBeforeUnload);
      }
  }

  static _removeInstance(instance) {
      if (
          PageExitPrevention._instances.delete(instance) &&
          PageExitPrevention._instances.size === 0
      ) {
          window.removeEventListener('beforeunload', PageExitPrevention._onBeforeUnload);
      }
  }

  static _onBeforeUnload(e) {
      if (PageExitPrevention._instances.size === 0) {
          return;
      }

      e.preventDefault();
      e.returnValue = '';
      return '';
  }
}

PageExitPrevention._instances = new Map();
