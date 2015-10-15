'use strict';

const Slack = require('slack-client');
const config = require('../config.json');

module.exports = new Slack(config.slackToken, true, true);
