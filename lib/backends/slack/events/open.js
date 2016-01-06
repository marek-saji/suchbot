'use strict';

const config = require('../../../../config.json');
const log = require('../../../log');

module.exports = function () {
    var channelNames = [];
    var groupNames = [];

    for (let i in this.channels)
    {
        if (this.channels[i].is_member)
        {
            channelNames.push('#' + this.channels[i].name);
        }
    }
    log('Ready to conversate in channels: ' + channelNames.join(', '));

    for (let i in this.groups)
    {
        groupNames.push('#' + this.groups[i].name);
    }
    log('Ready to conversate in groups: ' + groupNames.join(', '));

    log('Ready to conversate with any user');


    this.suchBotEventEmitter.emit('open');
};
