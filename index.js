'use strict';

const slack = require('./lib/slack');
const slackEventOpen = require('./lib/slackEvents/open');
const slackEventMessage = require('./lib/slackEvents/message');
const slackEventError = require('./lib/slackEvents/error');


slack.on('open', slackEventOpen);
slack.on('error', slackEventError);
slack.on('message', slackEventMessage);

slack.login();
