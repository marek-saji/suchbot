'use strict';

const iconv = require('iconv');

const asciiTranslit = new iconv.Iconv('UTF-8', 'ASCII//TRANSLIT');

const log = require('../../../log');

var mentionRegExp;

function getMentionRegExp (slack)
{
    if (! mentionRegExp)
    {
        mentionRegExp = new RegExp('^(<@' + slack.self.id + '>|' + slack.self.name + '):? *');
    }

    return mentionRegExp;
}


function respond (slack, response)
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

    log(this.here, '<' + this.userName + '>', this.text);
    log(this.here, '<' + slack.self.name + '>', response);

    this.channel.send(response);
}


function normalizeText (text)
{
    return asciiTranslit.convert(text).toString()
        .replace(/[',]/g, '');
}


function createSuchBotEvent (slackEvent)
{
    let event = {};
    let user;
    let channel;

    if (slackEvent.user)
    {
        user = this.getUserByID(slackEvent.user);
    }
    event.userName = user && user.name;
    if (slackEvent.channel)
    {
        channel = this.getChannelGroupOrDMByID(slackEvent.channel);
    }
    event.channel = channel;
    event.channelName = channel && channel.name;

    event.date = new Date(slackEvent.ts * 1000);
    event.isMessage = 'message' === slackEvent.type && 'bot_message' !== slackEvent.subtype;
    event.text = event.isMessage ? '' + slackEvent.text : '';
    event.text = event.text.replace(getMentionRegExp(this), '');
    event.normalizedText = normalizeText(event.text);
    event.isDm = channel.is_im;
    event.isMention = getMentionRegExp(this).test(slackEvent.text);
    event.isDirected = event.isDm || event.isMention;

    event.here
        = event.isDm
        ? '@' + event.channelName
        : ( event.channel.is_group || event.channel.is_channel )
        ? '#' + event.channelName
        : '?' + event.channelName;

    event.respond = respond.bind(event, this);

    return event;
}

module.exports = function (slackEvent) {
    let event = createSuchBotEvent.call(this, slackEvent);
    if (event.isMessage)
    {
        if (event.isDirected)
        {
            this.suchBotEventEmitter.emit('directedmessage', event);
        }
        else
        {
            this.suchBotEventEmitter.emit('generalmessage', event);
        }
    }
};
