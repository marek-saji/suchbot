'use strict';

const eventEmitter = require('../eventEmitter');
const slack = require('../slack');

var mentionRegExp;

function getMentionRegExp ()
{
    if (! mentionRegExp)
    {
        mentionRegExp = new RegExp('<@' + slack.self.id + '>|^' + slack.self.name + '[: ]');
    }

    return mentionRegExp;
}


function respond (response)
{
    // if array given as response -- choose a random one
    if (Array.isArray(response))
    {
        let idx = parseInt(Math.random() * response.length);
        response = response[idx];
    }

    if (this.isDm)
    {
        response = '' + response;
    }
    else
    {
        // prefix with mention, when answering outside DM
        response = '@' + this.userName + ': ' + response;
    }

    console.log(
        this.date.toISOString(),
        this.here,
        '<' + this.userName + '>',
        this.text
    );
    console.log(
        this.date.toISOString(),
        this.here,
        '<' + slack.self.name + '>',
        response
    );

    this.channel.send(response);
}


function createSuchBotEvent (slackEvent)
{
    let event = {};
    let user;
    let channel;

    if (slackEvent.user)
    {
        user = slack.getUserByID(slackEvent.user);
    }
    event.userName = user && user.name;
    if (slackEvent.channel)
    {
        channel = slack.getChannelGroupOrDMByID(slackEvent.channel);
    }
    event.channel = channel;
    event.channelName = channel && channel.name;

    event.date = new Date(slackEvent.ts * 1000);
    event.isMessage = 'message' === slackEvent.type;
    event.text = slackEvent.text;
    event.isDm = channel.is_im;
    event.isMention = getMentionRegExp().test(event.text);
    event.isDirected = event.isDm || event.isMention;

    event.here
        = event.isDm
        ? '@' + event.channelName
        : ( event.channel.is_group || event.channel.is_channel )
        ? '#' + event.channelName
        : '?' + event.channelName;

    event.respond = respond.bind(event);

    return event;
}

module.exports = function (slackEvent) {
    let event = createSuchBotEvent(slackEvent);
    if (event.isMessage)
    {
        if (event.isDirected)
        {
            eventEmitter.emit('directedmessage', event);
        }
        else
        {
            eventEmitter.emit('generalmessage', event);
        }
    }
};
