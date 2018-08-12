'use strict';

const Slack = require('@slack/client');

const useCache = require('../../useCache');
const _ = require('../../protectedContainer');
const Backend = require('../../Backend');
const Event = require('./Event');

const RtmClient = Slack.RTMClient;
const WebClient = Slack.WebClient;

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
    const channel = (! slackEvent.channel)
        ? null
        : await this.getChannelById(slackEvent.channel)
        || await this.getImById(slackEvent.channel)
        || await this.getGroupById(slackEvent.channel);
    let event = new Event(this, slackEvent, botUser, user, channel);

    event.onBeforeReact = logMessage.bind(
        null,
        event.here,
        `@${event.userName}`,
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


function createGetByProp (getAll, prop)
{
    return (value) => getAll().then(all => all.find(item => item[prop] === value));
}



module.exports = class SlackBackend extends Backend {

    constructor (name, eventEmitter, plugins, slackConfig)
    {
        super(name, eventEmitter, plugins);
        this.type = 'slack';


        this.getUsers = useCache(this.getItemsList.bind(this, 'users', 'members'));
        this.getUserById = useCache(createGetByProp(this.getUsers, 'id'));
        this.getUserByName = useCache(createGetByProp(this.getUsers, 'name'));

        this.getIms = useCache(this.getItemsList.bind(this, 'im', 'ims'));
        this.getImById = useCache(createGetByProp(this.getIms, 'id'));
        this.getImByUserId = useCache(createGetByProp(this.getIms, 'user'));
        this.getImByUserName = useCache((userName) => {
            return this.getUserByName(userName)
                .then(({id}) => this.getImByUserId(id));
        });

        this.getAllChannels = useCache(this.getItemsList.bind(this, 'channels'));
        this.getChannels = useCache(() => {
            return this.getAllChannels()
                .then(chs => chs.filter(ch => ch.is_member))
        });
        this.getChannelById = useCache(createGetByProp(this.getChannels, 'id'));
        this.getChannelByName = useCache(createGetByProp(this.getChannels, 'name'));

        this.getGroups = useCache(this.getItemsList.bind(this, 'groups'));
        this.getGroupById = useCache(createGetByProp(this.getGroups, 'id'));
        this.getGroupByName = useCache(createGetByProp(this.getGroups, 'name'));

        let log = _(this).log;

        let rtm = new RtmClient(slackConfig.token, {
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


    getItemsList (type, prop = type)
    {
        const web = _(this).web;
        return web[type].list()
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
