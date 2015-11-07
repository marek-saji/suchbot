'use strict';

const config = require('../../config.json');
const eventEmitter = require('../eventEmitter');
const log = require('../log');
const slack = require('../slack');
const plugins = require('../plugins');

module.exports = function () {
    var channelNames = [];
    var groupNames = [];

    for (let i in slack.channels)
    {
        if (slack.channels[i].is_member)
        {
            channelNames.push('#' + slack.channels[i].name);
        }
    }
    log('Ready to conversate in channels: ' + channelNames.join(', '));

    for (let i in slack.groups)
    {
        groupNames.push('#' + slack.groups[i].name);
    }
    log('Ready to conversate in groups: ' + groupNames.join(', '));

    log('Ready to conversate with any user');


    eventEmitter.emit('open');
};
