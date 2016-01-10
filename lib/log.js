'use strict';

const getType = function (argument) {
    let type = typeof argument;
    if ('object' === type)
    {
        type = Object.prototype.toString.call(argument);
    }
    return type;
};

const logInfo = function (source, message) {
    let argv = [
        '[' + (new Date).toISOString() + ']',
        ...arguments
    ].map(argument => {
        if ('[object String]' === getType(argument))
        {
            return argument.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
        }
        else
        {
            return argument;
        }
    });
    argv[1] = '[' + argv[1] + ']';
    console.log.apply(console, argv);
};

const logError = function (source, error) {
    let argv = [
        '[' + (new Date).toISOString() + ']',
        'ERROR',
        ...arguments
    ].map(argument => {
        if ('[object Error]' === getType(argument))
        {
            return argument.stack;
        }
        else
        {
            return argument;
        }
    });
    argv[1] = '[' + argv[1] + ']';
    console.error.apply(console, argv);
};


logInfo.info = logInfo;
logInfo.error = logError;

module.exports = logInfo;
