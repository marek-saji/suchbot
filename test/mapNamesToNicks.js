/* eslint-disable func-names,prefer-arrow-callback, spaced-comment */

const assert = require('assert');
const AssertionError = assert.AssertionError;

const mapNamesToNicks = require('../lib/mapNamesToNicks');

let winCount = 0;
let failCount = 0;

// Promote unhandled promise rejections to errors
process.on('unhandledRejection', error => {
    throw error;
});

process.on('uncaughtException', error => {
    process.stdout.write('\n');
    process.stdout.write(error.stack + '\n');
    // eslint-disable-next-line no-process-exit
    process.exit(1);
});

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

    // eslint-disable-next-line no-process-exit
    process.exit(failCount > 0 ? 1 : 0);
}



test(function returnsExactMatch () {
    const nickToNamesMap = new Map([
        ['A', {names: ['John Joseph Smith']}],
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
        ['A', {names: ['john joseph smith']}],
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
        ['A', {names: ['Jóhń Jósęph Śmith€']}],
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
        ['A', {names: ['John Joseph Smith']}],
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
        ['A', {names: ['John Joseph Smith']}],
        ['B', {names: ['John Joseph Smith']}],
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
        ['A', {names: ['John Joseph Smith']}],
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
        ['A', {names: ['John Joseph Smith']}],
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
        ['A', {names: ['John Joseph Smith']}],
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
        ['A', {names: ['John Joseph Smith']}],
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
