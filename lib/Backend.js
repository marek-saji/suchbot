'use strict';

const _ = require('./protectedContainer');
const logger = require('./log');

function _createLogger ()
{
    let log = logger.bind(logger, this.name);
    log.info = log;

    for (let prop in logger)
    {
        if ('info' !== prop && logger.hasOwnProperty(prop))
        {
            log[prop] = logger[prop].bind(logger, this.name);
        }
    }

    return log;
}

function _logMessage (where, who, what)
{
    let log = _(this).log;
    log(where, who, what);
}



module.exports = class Backend {

    constructor (name, eventEmitter, plugins)
    {
        this.name = name;
        this.eventEmitter = eventEmitter;

        const log = _createLogger.call(this);

        _(this).log = log;
        _(this).logMessage = _logMessage.bind(this);

        plugins.forEach((plugin, name) => {
            log('Registering plugin', name);
            plugin.register(this);
        });
    }


    get nick ()
    {
        throw new Error('Not implemented');
    }

    messageUser ()
    {
        throw new Error('Not implemented');
    }

    messageUserOnChannel ()
    {
        throw new Error('Not implemented');
    }

    messageChannel ()
    {
        throw new Error('Not implemented');
    }

};
