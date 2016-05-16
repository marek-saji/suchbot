'use strict';

const config = require('../../../config.json');

const Slack = require('@slack/client');

const _ = require('../../protectedContainer');
const Backend = require('../../Backend');
const Event = require('./Event');

const RtmClient = Slack.RtmClient;
const MemoryDataStore = Slack.MemoryDataStore;
const CLIENT_EVENTS = Slack.CLIENT_EVENTS;
const RTM_EVENTS = Slack.RTM_EVENTS;

var r;

function onAuth ()
{
    let rtm = _(this).rtm;
    let rtmData = rtm.dataStore;
    let log = _(this).log;
    let channelNames = [];
    let groupNames = [];

    log('Connected. I am ' + this.nick);

    for (let i in rtmData.channels)
    {
        if (rtmData.channels[i].is_member)
        {
            channelNames.push('#' + rtmData.channels[i].name);
        }
    }
    log('Ready to conversate in channels: ' + channelNames.join(', '));

    for (let i in rtmData.groups)
    {
        groupNames.push('#' + rtmData.groups[i].name);
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
    let rtm = _(this).rtm;
    let logMessage = _(this).logMessage;
    let event = new Event(this, rtm, slackEvent);

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

    constructor (name, eventEmitter, plugins, slackConfig)
    {
        super(name, eventEmitter, plugins);
        this.type = 'slack';

        let log = _(this).log;

        let rtm = new RtmClient(slackConfig.token, {
            // logLevel: 'debug',
            // Cache data in memory
            dataStore: new MemoryDataStore({})
        });
        r = rtm;
        _(this).rtm = rtm;


        rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, onAuth.bind(this));
        // rtm.on(RTM_EVENTS.ERROR, onError.bind(this));
        rtm.on(RTM_EVENTS.MESSAGE, onMessage.bind(this));

        log('Connecting');
        rtm.start();
    }


    get botUser ()
    {
        let rtm = _(this).rtm;
        let rtmData = rtm.dataStore;
        return rtmData.users[ rtm.activeUserId ];
    }


    get nick ()
    {
        return this.botUser.name;
    }

    messageUser (userName, message)
    {
        let log = _(this).log;
        let rtm = _(this).rtm;
        let rtmData = rtm.dataStore;
        let logMessage = _(this).logMessage;
        let channel = rtmData.getDMByName(userName);
        if (! channel)
        {
            log.error('Failed to get DM by name “' + userName + '”');
            return;
        }
        message = prepareMessage(message);
        rtm.sendMessage(message, channel.id);
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
        let rtm = _(this).rtm;
        let rtmData = rtm.dataStore;
        let logMessage = _(this).logMessage;
        let channel = rtmData.getChannelOrGroupByName(channelName);
        if (! channel || ! ( channel.is_channel || channel.is_group ))
        {
            log.error('Failed to get chanell/group by name “' + channelName + '”');
            return;
        }
        message = prepareMessage(message);
        rtm.sendMessage(message, channel.id);
        logMessage('#' + channelName, '@' + this.nick, message);
    }

};
