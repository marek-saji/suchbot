const transliterate = require('transliteration').transliterate;

const Event = require('../../BackendEvent');

function normalizeText (text)
{
    return transliterate(text).replace(/[',]/g, '');
}

class GoogleHangoutsChatEvent extends Event
{
    constructor (backend, data, sendAnswer)
    {
        super(backend);

        this.date = new Date(data.eventTime);

        this.isDm = data.space.type === 'DM';
        // Google Hangouts Chat does not report non-mention messages,
        // so all messages from ROOM are mentions.
        this.isMention = data.space.type === 'ROOM';
        this.isDirected = this.isDm || this.isMention;
        this.isMessage = data.type === 'MESSAGE';

        this.userName = data.user.displayName;
        this.channelName = (!this.isDm) && data.space.displayName;

        this.text = data.message.argumentText;
        this.normalizedText = normalizeText(this.text);
        this.here = this.isDm ? this.userName : this.channelName;

        this.getNickToUserNamesMap = backend.getNickToUserNamesMap.bind(backend);

        if (this.isDm)
        {
            this.respond = response => {
                const message = this.prepareMessage(response);
                this.onBeforeRespond(message);
                sendAnswer(message);
            };
        }
        else
        {
            this.respond = response => {
                const message = this.prepareMessage(response);
                this.onBeforeRespond(message);
                sendAnswer(`<${data.user.name}> ${message}`);
            };
        }

        this.react = response => {
            const message = this.prepareMessage(response);
            this.onBeforeReact(message);
            sendAnswer(message);
        };
    }
}


module.exports = GoogleHangoutsChatEvent;
