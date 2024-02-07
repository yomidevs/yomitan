/*
 * Copyright (C) 2024  Yomitan Authors
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

import {describe, test} from 'vitest';
import {Handlebars} from '../ext/lib/handlebars.js';

describe('Handlebars', () => {
    test('compile vs compileAST 1', ({expect}) => {
        const template = '{{~test1~}}';

        const data = {
            test1: '<div style="font-size: 4em;">Test</div>'
        };

        const instance1 = Handlebars.compile(template);
        const instance2 = Handlebars.compileAST(template);

        const result1 = instance1(data);
        const result2 = instance2(data);

        expect.soft(result1).equals('&lt;div style&#x3D;&quot;font-size: 4em;&quot;&gt;Test&lt;/div&gt;');
        expect.soft(result2).equals('&lt;div style&#x3D;&quot;font-size: 4em;&quot;&gt;Test&lt;/div&gt;');
    });
    test('compile vs compileAST 2', ({expect}) => {
        const template = '{{~test1.test2~}}';

        const data = {
            test1: {
                test2: '<div style="font-size: 4em;">Test</div>'
            }
        };

        const instance1 = Handlebars.compile(template);
        const instance2 = Handlebars.compileAST(template);

        const result1 = instance1(data);
        const result2 = instance2(data);

        expect.soft(result1).equals('&lt;div style&#x3D;&quot;font-size: 4em;&quot;&gt;Test&lt;/div&gt;');
        expect.soft(result2).equals('&lt;div style&#x3D;&quot;font-size: 4em;&quot;&gt;Test&lt;/div&gt;');
    });
});
