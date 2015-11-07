'use strict';

const logInfo = function (message) {
    let argv = [
        '[' + (new Date).toISOString() + ']',
        ...arguments
    ].map(argument => {
        if ('[object String]' === Object.prototype.toString.call(argument))
        {
            return argument.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
        }
        else
        {
            return argument;
        }
    });
    console.log.apply(console, argv);
};

const logError = function (error) {
    let argv = [
        '[' + (new Date).toISOString() + ']',
        'ERROR',
        ...arguments
    ].map(argument => {
        if ('[object Error]' === Object.prototype.toString.call(argument))
        {
            return argument.stack;
        }
        else
        {
            return argument;
        }
    });
    console.error.apply(console, argv);
};


logInfo.info = logInfo;
logInfo.error = logError;

module.exports = logInfo;
