'use strict';

const _ = require('./protectedContainer');

module.exports = class Event {

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
        this.onBeforeReact   = () => {};

        this.respond = () => { throw new Error('Not implemented'); };
        this.react = () => { throw new Error('Not implemented'); };
    }

};
