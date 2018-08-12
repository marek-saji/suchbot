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

        this.onBeforeRespond = () => {};
        this.onBeforeReact = () => {};

        this.respond = () => { throw new Error('Not implemented'); };
        this.react = () => { throw new Error('Not implemented'); };
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
