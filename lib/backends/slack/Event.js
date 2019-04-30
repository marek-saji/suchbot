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

    // source is a channel or group or DM
    constructor (backend, slackEvent, botUser, user, source)
    {
        let mentionRegExp = getMentionRegExp(botUser);

        super(backend);

        this.date = new Date(slackEvent.ts * 1000);

        this.isDm = source && source.is_im;
        this.isMention = mentionRegExp.test(slackEvent.text);
        this.isDirected = this.isDm || this.isMention;
        this.userName = user && user.name;
        this.channelName = source && ! this.isDm && source.name;

        this.isMessage = 'message' === slackEvent.type && 'bot_message' !== slackEvent.subtype;
        this.text = this.isMessage ? '' + slackEvent.text : '';
        this.text = this.text.replace(mentionRegExp, '');
        this.normalizedText = normalizeText(this.text);

        this.here
            = this.isDm
            ? '@' + this.userName
            : (source && ( source.is_group || source.is_channel ))
            ? '#' + this.channelName
            : '?' + this.channelName;

        if (this.isDm)
        {
            this.respond = message => {
                message = this.prepareMessage(message);
                this.onBeforeRespond(message);
                backend.messageUser(this.userName, message);
            };
            this.react = message => {
                message = this.prepareMessage(message);
                this.onBeforeReact(message);
                backend.messageUser(this.userName, message);
            };
        }
        else if (source.is_channel || source.is_group)
        {
            this.respond = message => {
                message = this.prepareMessage(message);
                this.onBeforeRespond(message);
                backend.messageUserOnChannel(this.channelName, this.userName, message);
            };
            this.react = message => {
                message = this.prepareMessage(message);
                this.onBeforeReact(message);
                backend.messageChannel(this.channelName, message);
            };
        }
    }

};
