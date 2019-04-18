/* eslint-disable */

const Backend = require('../../Backend');
const Event = require('./Event');
const _ = require('../../protectedContainer');

function onMessage (data, sendAnswer)
{
    const logMessage = _(this).logMessage;

    if (data.type !== 'MESSAGE')
    {
        return sendAnswer(null);
    }

    const event = new Event(this, data, sendAnswer);

    event.onBeforeReact = (message) => {
        logMessage(event.here, `@${event.userName}`, event.text);
        logMessage(event.here, `@${this.botName}`, message);
    };
    event.onBeforeRespond = event.onBeforeReact;

    if (event.isDirected)
    {
        this.eventEmitter.emit('directedmessage', event);
    }
    else
    {
        this.eventEmitter.emit('generalmessage', event);
    }
}

class GoogleHangoutsChatBackend extends Backend {

    constructor (name, eventEmitter, plugins, config)
    {
        super(name, eventEmitter, plugins);
        this.type = 'google-hangouts-chat';

        this.users = {};

        this.botName = config.botName;

        const { httpApp } = config;

        httpApp.post(config.route, (req, res) => {
            const data = req.body;
            this.users[data.user.name] = data.user;
            return onMessage.call(
                this,
                data,
                answer => {
                    return res.json({ text: answer });
                }
            );
        });

        this.eventEmitter.emit('open');
    }

    getBotNick ()
    {
        return this.botName;
    }

    getUsers ()
    {
        return Object.values(this.users).map(user => ({
            name: user.displayName,
            email: user.email,
            deleted: false,
        }));
    }

    static getAllNamesFromUser (user)
    {
        return Array.from(new Set([
            user.name,
            (user.email || '').split('@')[0],
        ].filter(v => v !== '')));
    }

    messageUser (userName, message)
    {
        throw new Error('Unimplemented');
    }

    messageUserOnChannel (channelName, userName, message)
    {
        throw new Error('Unimplemented');
    }

    messageChannel (channelName, message)
    {
        throw new Error('Unimplemented');
    }
}


module.exports = GoogleHangoutsChatBackend;
