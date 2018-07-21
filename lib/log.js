'use strict';

const getType = function (argument) {
    let type = typeof argument;
    if ('object' === type)
    {
        type =
            Object.prototype.toString.call(argument)
            .match(/\[object (.*)\]/)[1].toLowerCase();
    }
    return type;
};

const logInfo = function (source, message, ...rest) {
    let argv = [
        '[' + (new Date).toISOString() + ']',
        source,
        message,
        ...rest
    ].map(argument => {
        if ('string' === getType(argument))
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

const logError = function (source, error, ...rest) {
    let argv = [
        '[' + (new Date).toISOString() + ']',
        'ERROR',
        source,
        error,
        ...rest
    ].map(argument => {
        if ('error' === getType(argument))
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
