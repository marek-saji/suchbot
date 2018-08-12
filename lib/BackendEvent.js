'use strict';

const config = require('../config');
const messageSuffix = config.messageSuffix || '';

class Event
{
    constructor ()
    {
        this.date = new Date();

        this.userName = undefined;
        this.channelName = undefined;

        this.isDm = undefined;
        this.isMention = undefined;
        this.isDirected = undefined;
        this.isMessage = undefined;
        this.text = undefined;
        this.normalizedText = undefined;
        this.here = undefined;
    }


    /**
     * May be overwritten when constructing an event
     */
    // eslint-disable-next-line no-unused-vars
    onBeforeRespond (message)
    {
    }

    /**
     * To be overwritten in backend-specific event classes
     */
    // eslint-disable-next-line no-unused-vars
    respond (message)
    {
        throw new Error('Not implemented');
    }

    /**
     * May be overwritten when constructing an event
     */
    // eslint-disable-next-line no-unused-vars
    onBeforeReact (message)
    {
    }

    /**
     * To be overwritten in backend-specific event classes
     */
    // eslint-disable-next-line no-unused-vars
    react (message)
    {
        throw new Error('Not implemented');
    }


    prepareMessage (message)
    {
        if (Array.isArray(message))
        {
            let idx = parseInt(Math.random() * message.length);
            message = message[idx];
        }
        message += '';

        if (messageSuffix && message.substr(-1 * messageSuffix.length) !== messageSuffix)
        {
            message += messageSuffix;
        }

        return message;
    }
}

module.exports = Event;
