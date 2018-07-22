'use strict';

const transliterate = require('transliteration').transliterate;

const Event = require('../../BackendEvent');


function getMentionRegExp (botUser)
{
    return new RegExp('^(<@' + botUser.id + '(|\\|' + botUser.name + ')>|' + botUser.name + '):? *');
}

function normalizeText (text)
{
    return transliterate(text).replace(/[',]/g, '');
}


module.exports = class SlackEvent extends Event {

    // channel is a channel or group or DM
    constructor (backend, slackEvent, botUser, user, channel)
    {
        let mentionRegExp = getMentionRegExp(botUser);

        super();

        this.date = new Date(slackEvent.ts * 1000);

        this.isDm = channel.is_im;
        this.isMention = mentionRegExp.test(slackEvent.text);
        this.isDirected = this.isDm || this.isMention;
        this.userName = user && user.name;
        this.channelName = channel && ! this.isDm && channel.name;

        this.isMessage = 'message' === slackEvent.type && 'bot_message' !== slackEvent.subtype;
        this.text = this.isMessage ? '' + slackEvent.text : '';
        this.text = this.text.replace(mentionRegExp, '');
        this.normalizedText = normalizeText(this.text);

        this.here
            = this.isDm
            ? '@' + this.userName
            : (channel && ( channel.is_group || channel.is_channel ))
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
