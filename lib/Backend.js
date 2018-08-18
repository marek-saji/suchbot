'use strict';

const transliterate = require('transliteration').transliterate;
const escRE = require('escape-string-regexp');

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


    /**
     * @param {string} name Person’s name. May be just first or last or
     *        both or whatever
     * @returns {string} User’s unique display / nick name
     */
    // eslint-disable-next-line no-unused-vars,require-await
    async matchUserByName (name)
    {
        throw new Error('Not implemented');
    }

    static normalizePersonName (name)
    {
        const normalizedName = transliterate(name);
        const nameParts = normalizedName.split(/[\s_.][^\w]*|[^\w]*[\s_.]/);
        return nameParts.join(' ');
    }

    static createTestersForPattern (pattern)
    {
        return [
            new RegExp(`^${escRE(pattern)}$`),
            new RegExp(`^${escRE(pattern)}$`, 'i'),
            new RegExp(`\\b${escRE(pattern)}$`),
            new RegExp(`\\b${escRE(pattern)}$`, 'i'),
            new RegExp(`\\b${escRE(pattern)}\\b`),
            new RegExp(`\\b${escRE(pattern)}\\b`, 'i'),
        ];
    }

    /**
     * @param {string} name Person’s name. May be just first or last or
     *        both or whatever
     * @returns {Array} of functions. Functions with lower
     *          indexes are to be considered better matches
     */
    createUserNameTesters (name)
    {
        const regExps = [];
        const nameParts = this.constructor.normalizePersonName(name).split(' ');
        const firstPart = nameParts[0];
        const lastPart = nameParts[nameParts.length - 1];

        // Match all parts
        {
            const pattern = nameParts.join(' ');
            this.constructor.createTestersForPattern(pattern)
                .forEach(re => regExps.push(re));
        }

        // Match by first and last part
        // Possibly first and last name
        if (nameParts.length > 2)
        {
            const pattern = `${firstPart} ${lastPart}`;
            this.constructor.createTestersForPattern(pattern)
                .forEach(re => regExps.push(re));
        }

        // Match by first and last parts in reverse order
        if (nameParts.length > 1)
        {
            const pattern = `${lastPart} ${firstPart}`;
            this.constructor.createTestersForPattern(pattern)
                .forEach(re => regExps.push(re));
        }

        // Match by last part
        // Possibly last name or, if there are more than one part,
        // first name
        if (nameParts.length > 1)
        {
            const pattern = lastPart;
            this.constructor.createTestersForPattern(pattern)
                .forEach(re => regExps.push(re));
        }

        // Match by first part
        // Possibly first name.
        // If there is just one part we already matched that by
        // matching last part.
        if (nameParts.length > 1)
        {
            const pattern = firstPart;
            this.constructor.createTestersForPattern(pattern)
                .forEach(re => regExps.push(re));
        }

        return regExps.map(
            re => name => re.test(this.constructor.normalizePersonName(name))
        );
    }

};
