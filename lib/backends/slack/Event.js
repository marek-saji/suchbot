'use strict';

const iconv = require('iconv');
const asciiTranslit = new iconv.Iconv('UTF-8', 'ASCII//TRANSLIT');

const _ = require('../../protectedContainer');
const Event = require('../../BackendEvent');


function getMentionRegExp (slackSelf)
{
    return new RegExp('^(<@' + slackSelf.id + '>|' + slackSelf.name + '):? *');
}

function normalizeText (text)
{
    return asciiTranslit.convert(text).toString()
        .replace(/[',]/g, '');
}


module.exports = class SlackEvent extends Event {

    constructor (backend, slack, slackEvent)
    {
        let user;
        let channel;

        super();

        if (slackEvent.user)
        {
            user = slack.getUserByID(slackEvent.user);
        }
        if (slackEvent.channel)
        {
            channel = slack.getChannelGroupOrDMByID(slackEvent.channel);
        }

        this.date = new Date(slackEvent.ts * 1000);

        this.isDm = channel.is_im;
        this.isMention = getMentionRegExp(slack.self).test(slackEvent.text);
        this.isDirected = this.isDm || this.isMention;
        this.userName = user && user.name;
        this.channelName = channel && ! this.isDm && channel.name;

        this.isMessage = 'message' === slackEvent.type && 'bot_message' !== slackEvent.subtype;
        this.text = this.isMessage ? '' + slackEvent.text : '';
        this.text = this.text.replace(getMentionRegExp(slack.self), '');
        this.normalizedText = normalizeText(this.text);

        this.here
            = this.isDm
            ? '@' + this.userName
            : ( channel.is_group || channel.is_channel )
            ? '#' + this.channelName
            : '?' + this.channelName;

        if (channel.is_im)
        {
            this.respond = message => {
                this.onBeforeRespond();
                backend.messageUser(this.userName, message);
            };
            this.react = message => {
                this.onBeforeReact();
                backend.messageUser(this.userName, message);
            };
        }
        else if (channel.is_channel || channel.is_group)
        {
            this.respond = message => {
                this.onBeforeRespond();
                backend.messageUserOnChannel(this.channelName, this.userName, message);
            };
            this.react = message => {
                this.onBeforeReact();
                backend.messageChannel(this.channelName, message);
            };
        }
    }

};
