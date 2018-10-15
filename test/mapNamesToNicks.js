/* eslint-disable func-names,prefer-arrow-callback, spaced-comment */

const assert = require('assert');
const AssertionError = assert.AssertionError;

const mapNamesToNicks = require('../lib/mapNamesToNicks');

let winCount = 0;
let failCount = 0;

function test (testFunction)
{
    process.stdout.write('   ' + testFunction.name + ' ');
    try
    {
        testFunction();
        process.stdout.write('\r✅ ' + testFunction.name + '\n');
        winCount += 1;
    }
    catch (error)
    {
        if (! (error instanceof AssertionError))
        {
            process.stdout.write('\n');
            throw error;
        }
        process.stdout.write('\r❌ ' + testFunction.name + '\n');
        process.stdout.write(error.message + '\n');
        failCount += 1;
    }
}

function summary ()
{
    process.stdout.write('\n');
    if (failCount)
    {
        process.stdout.write('❌');
    }
    else
    {
        process.stdout.write('🎉');
    }
    process.stdout.write(' ' + (winCount + failCount) + ' tests ran. ' + failCount + ' tests failed.\n')
}



test(function returnsExactMatch () {
    const nickToNamesMap = new Map([
        ['A', ['John Joseph Smith']],
    ]);

    const names = [
        'John Joseph Smith',
    ];

    assert.deepEqual(
        new Map([
            ['John Joseph Smith', 'A'],
        ]),
        mapNamesToNicks(nickToNamesMap, names)
    );
});


test(function ignoresCase () {
    const nickToNamesMap = new Map([
        ['A', ['john joseph smith']],
    ]);

    const names = [
        'John Joseph Smith',
    ];

    assert.deepEqual(
        new Map([
            ['John Joseph Smith', 'A'],
        ]),
        mapNamesToNicks(nickToNamesMap, names)
    );
});


test(function ignoresDiacritics () {
    const nickToNamesMap = new Map([
        ['A', ['Jóhń Jósęph Śmith€']],
    ]);

    const names = [
        'John Joseph SmithEU',
    ];

    assert.deepEqual(
        new Map([
            ['John Joseph SmithEU', 'A'],
        ]),
        mapNamesToNicks(nickToNamesMap, names)
    );
});


test(function returnsEmptyWithNoMatches () {
    const nickToNamesMap = new Map([
        ['A', ['John Joseph Smith']],
    ]);

    const names = [
        'Sam Jones',
    ];

    assert.deepEqual(
        new Map([]),
        mapNamesToNicks(nickToNamesMap, names)
    );
});


test(function returnsEmptyWithMultipleExactMatches () {
    const nickToNamesMap = new Map([
        ['A', ['John Joseph Smith']],
        ['B', ['John Joseph Smith']],
    ]);

    const names = [
        'Joe Smith',
    ];

    assert.deepEqual(
        new Map([]),
        mapNamesToNicks(nickToNamesMap, names)
    );
});


test(function returnsFirstAndLastPartMatch () {
    const nickToNamesMap = new Map([
        ['A', ['John Joseph Smith']],
    ]);

    const names = [
        'John Smith',
    ];

    assert.deepEqual(
        new Map([
            ['John Smith', 'A'],
        ]),
        mapNamesToNicks(nickToNamesMap, names)
    );
});


test(function returnsLastAndFirstPartMatch () {
    const nickToNamesMap = new Map([
        ['A', ['John Joseph Smith']],
    ]);

    const names = [
        'Smith John',
    ];

    assert.deepEqual(
        new Map([
            ['Smith John', 'A'],
        ]),
        mapNamesToNicks(nickToNamesMap, names)
    );
});


test(function returnsLastPartMatch () {
    const nickToNamesMap = new Map([
        ['A', ['John Joseph Smith']],
    ]);

    const names = [
        'Smith',
    ];

    assert.deepEqual(
        new Map([
            ['Smith', 'A'],
        ]),
        mapNamesToNicks(nickToNamesMap, names)
    );
});


test(function returnsFirstPartMatch () {
    const nickToNamesMap = new Map([
        ['A', ['John Joseph Smith']],
    ]);

    const names = [
        'John',
    ];

    assert.deepEqual(
        new Map([
            ['John', 'A'],
        ]),
        mapNamesToNicks(nickToNamesMap, names)
    );
});


summary();
