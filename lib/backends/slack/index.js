'use strict';

const config = require('../../../config.json');

const Slack = require('slack-client');

const _ = require('../../protectedContainer');
const Backend = require('../../Backend');
const Event = require('./Event');


function onOpen ()
{
    let slack = _(this).slack;
    let log = _(this).log;

    let channelNames = [];
    let groupNames = [];

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


    this.eventEmitter.emit('open');
}


function onError (...errors)
{
    let log = _(this).log;
    log.error.apply(null, errors);
}


function onMessage (slackEvent)
{
    let slack = _(this).slack;
    let logMessage = _(this).logMessage;
    let event = new Event(this, slack, slackEvent);

    event.onBeforeReact = logMessage.bind(
        null,
        event.here,
        '@' + event.userName,
        event.text
    );
    event.onBeforeRespond = event.onBeforeReact;

    if (event.isMessage)
    {
        if (event.isDirected)
        {
            this.eventEmitter.emit('directedmessage', event);
        }
        else
        {
            this.eventEmitter.emit('generalmessage', event);
        }
    }
}



// TODO move it from there
function prepareMessage (message)
{
    if (Array.isArray(message))
    {
        let idx = parseInt(Math.random() * message.length);
        message = message[idx];
    }
    return '' + message;
}



module.exports = class SlackBackend extends Backend {

    constructor (name, eventEmitter, slackConfig)
    {
        super(name, eventEmitter);
        this.type = 'slack';

        let slack = new Slack(slackConfig.token, true, true);
        _(this).slack = slack;


        slack.on('open', onOpen.bind(this));
        slack.on('error', onError.bind(this));
        slack.on('message', onMessage.bind(this));

        slack.login();
    }


    get nick ()
    {
        let slack = _(this).slack;
        return slack.self.name;
    }

    messageUser (userName, message)
    {
        let log = _(this).log;
        let slack = _(this).slack;
        let logMessage = _(this).logMessage;
        let channel = slack.getDMByName(userName);
        if (! channel)
        {
            log.error('Failed to get DM by name “' + userName + '”');
            return;
        }
        message = prepareMessage(message);
        // console.log(message, typeof message);
        channel.send(message);
        logMessage('@' + userName, '@' + this.nick, message);
    }

    messageUserOnChannel (channelName, userName, message)
    {
        message = '@' + userName + ': ' + prepareMessage(message);
        this.messageChannel(channelName, message);
    }

    messageChannel (channelName, message)
    {
        let log = _(this).log;
        let slack = _(this).slack;
        let logMessage = _(this).logMessage;
        let channel = slack.getChannelGroupOrDMByName(channelName);
        if (! channel || ! ( channel.is_channel || channel.is_group ))
        {
            log.error('Failed to get chanell/group by name “' + channelName + '”');
            return;
        }
        message = prepareMessage(message);
        channel.send(message);
        logMessage('#' + channelName, '@' + this.nick, message);
    }

};
