'use strict';

const {RTMClient} = require('@slack/rtm-api');
const {WebClient} = require('@slack/web-api');

const useCache = require('../../useCache');
const _ = require('../../protectedContainer');
const Backend = require('../../Backend');
const Event = require('./Event');

async function onAuth ()
{
    let log = _(this).log;

    log(
        'Connected. I am',
        await this.getBotNick()
    );

    log(
        'Ready to conversate in channels:',
        (await (this.getChannels().then(chs => chs.map(ch => `#${ch.name}`))))
            .join(', ')
    );

    log(
        'Ready to conversate in groups:',
        (await (this.getGroups().then(gs => gs.map(g => `#${g.name}`))))
            .join(', ')
    );

    log('Ready to conversate with any user');


    this.eventEmitter.emit('open');
}


async function onMessage (slackEvent)
{
    let logMessage = _(this).logMessage;
    const botUser = await this.getBotUser();
    const user = slackEvent.user ? await this.getUserById(slackEvent.user) : null;

    // Don’t respond to own messages
    if (user && user.id === botUser.id)
    {
        return;
    }

    const channel = (! slackEvent.channel)
        ? null
        : await this.getChannelById(slackEvent.channel)
        || await this.getImById(slackEvent.channel)
        || await this.getGroupById(slackEvent.channel);
    if (slackEvent.channel && !channel)
    {
        throw new Error(`Failed to get conversation by id=${slackEvent.channel}`)
    }
    let event = new Event(this, slackEvent, botUser, user, channel);

    event.onBeforeReact = (message) => {
        logMessage(event.here, `@${event.userName}`, event.text);
        logMessage(event.here, `@${botUser.name}`, message);
    };
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


function createGetByProp (getAll, prop)
{
    return async (value) => {
        const all = await getAll();
        if (! all)
        {
            throw new Error('Failed to get all');
        }

        const item = all.find(item => item[prop] === value);
        if (! item)
        {
            return null;
        }

        return item;
    }
}



module.exports = class SlackBackend extends Backend {

    constructor (name, eventEmitter, plugins, slackConfig)
    {
        super(name, eventEmitter, plugins);
        this.type = 'slack';


        this.getUsers = useCache(
            this.getItemsList.bind(this, 'users', 'members')
        );
        this.getUserById = createGetByProp(this.getUsers, 'id');
        this.getUserByName = createGetByProp(this.getUsers, 'name');

        const getConversationChannels = useCache(
            this.getItemsList.bind(this, 'conversations', 'channels', {
                types: ['public_channel', 'private_channel', 'mpim', 'im'].join()
            })
        )

        this.getIms = () => getConversationChannels()
            .then(chs => chs.filter(ch => ch.is_im));
        this.getImById = createGetByProp(this.getIms, 'id');
        this.getImByUserId = createGetByProp(this.getIms, 'user');
        this.getImByUserName = async (userName) => {
            const user = await this.getUserByName(userName);
            return user ? this.getImByUserId(user.id) : null;
        };

        this.getAllChannels = () => getConversationChannels()
            .then(chs => chs.filter(ch => ch.is_channel));
        this.getChannels = () => this.getAllChannels()
            .then(chs => chs.filter(ch => ch.is_member));
        this.getChannelById = createGetByProp(this.getChannels, 'id');
        this.getChannelByName = createGetByProp(this.getChannels, 'name');

        this.getGroups = () => getConversationChannels()
            .then(chs => chs.filter(ch => ch.is_group));
        this.getGroupById = createGetByProp(this.getGroups, 'id');
        this.getGroupByName = createGetByProp(this.getGroups, 'name');

        let log = _(this).log;

        let rtm = new RTMClient(slackConfig.token, {
            // logLevel: 'debug',
        });
        _(this).rtm = rtm;
        let web = new WebClient(slackConfig.token);
        _(this).web = web;


        rtm.on('authenticated', onAuth.bind(this));
        // rtm.on(RTM_EVENTS.ERROR, onError.bind(this));
        rtm.on('message', onMessage.bind(this));

        log('Connecting');
        rtm.start();
    }


    getItemsList (type, prop = type, opts = {})
    {
        const web = _(this).web;
        return web[type].list(opts)
            .then(result => result[prop]);
    }

    getBotUser ()
    {
        let rtm = _(this).rtm;
        return this.getUserById(rtm.activeUserId);
    }

    getBotNick ()
    {
        return this.getBotUser().then(user => user.name);
    }

    static getAllNamesFromUser (user)
    {
        return Array.from(new Set([
            user.profile.real_name,
            user.name,
            (user.profile.email || '').split('@')[0],
        ].filter(v => v !== '')));
    }

    async messageUser (userName, message)
    {
        let log = _(this).log;
        let rtm = _(this).rtm;
        let logMessage = _(this).logMessage;
        const channel = await this.getImByUserName(userName);
        if (! channel)
        {
            log.error(new Error(`Failed to get DM by name “${userName}”`));
            return;
        }
        rtm.sendMessage(message, channel.id);
        this.getBotNick(botNick => {
            logMessage(`@${userName}`, `@${botNick}`, message);
        });
    }

    messageUserOnChannel (channelName, userName, message)
    {
        message = `@${userName}: ${message}`;
        this.messageChannel(channelName, message);
    }

    async messageChannel (channelName, message)
    {
        let log = _(this).log;
        let rtm = _(this).rtm;
        let logMessage = _(this).logMessage;
        let channel =
            await this.getChannelByName(channelName)
            || await this.getGroupByName(channelName);
        if (! channel)
        {
            log.error(new Error(`Failed to get chanell/group by name “${channelName}”`));
            return;
        }
        rtm.sendMessage(message, channel.id);
        this.getBotNick(botNick => {
            logMessage(`#${channelName} @${botNick}`, message);
        });
    }

};
