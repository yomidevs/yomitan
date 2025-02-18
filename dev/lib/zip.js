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

/**
 * This script is importing a file within the '@zip.js/zip.js' dependency rather than
 * simply importing '@zip.js/zip.js'.
 *
 * This is done in order to only import the subset of functionality that the extension needs.
 *
 * In this case, this subset only includes the components to support decompression using web workers.
 *
 * Therefore, if this file or the built library file is imported in a development, testing, or
 * benchmark script, it will not be able to properly decompress the data of compressed zip files.
 *
 * As a workaround, testing zip data can be generated using {level: 0} compression.
 */

export * from '@zip.js/zip.js/lib/zip.js';
