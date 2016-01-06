'use strict';

const config = require('../../../config.json');

const Slack = require('slack-client');
const slackEventOpen = require('./events/open');
const slackEventMessage = require('./events/message');
const slackEventError = require('./events/error');



function start (backendName, slackConfig, eventEmitter)
{
    let slack = new Slack(slackConfig.token, true, true);
    slack.suchBotEventEmitter = eventEmitter; // FIXME

    slack.on('open', slackEventOpen);
    slack.on('error', slackEventError);
    slack.on('message', slackEventMessage);

    slack.login();

    // TODO return some sort of common API backend wrapper with methods
    // to chat to people / rooms etc
}


module.exports = {
    start: start
};
