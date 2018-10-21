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
    log(where, '<' + who + '>', what);
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


    getBotNick ()
    {
        throw new Error('Not implemented');
    }

    async getNickToUserNamesMap ()
    {
        const users = await this.getUsers();
        const map = new Map();
        for (const user of users)
        {
            const names = this.constructor.getAllNamesFromUser(user);
            if (names.length !== 0)
            {
                map.set(user.name, {
                    names,
                    deleted: !! user.deleted,
                });
            }
        }
        return map;
    }

    // eslint-disable-next-line no-unused-vars
    static getAllNamesFromUser (user)
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
