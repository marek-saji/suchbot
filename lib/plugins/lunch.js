'use strict';

const REFRESH_RATE_MS = 5 * 60 * 1000;

const fs = require('fs');
const readline = require('readline');

const google = require('googleapis').google;

const config = require('../../config.json');
const logger = require('../log');
const log = logger.bind(logger, 'lunch');

const lunchCache = {
    timestamp: null,
    items: new Map()
};

const l18n = [
    {
        lunchQuestionRegExp: /co .*na (obiad|lunch|lancz)/i,
        lunchTimeQuestionRegExp: /(kiedy|o ktorej)\s*(dzisiaj|jest)*\s*(obiad|lunch|lanch)/i,
        answers: {
            noLunch: [
                'Nie widzę, żeby coś było zamówione.',
                'Nie widzę w nic zamówieniach',
                'Wygląda na to, że nic'
            ],
            noNick: [
                'Nie widzę cię w zamówieniach',
                'Wiesz, że trzeba wpisać nazwę użytkownika w zamówieniach?',
                'Nie wiem kim jesteś, sorry :confused:'
            ],
            lunchTime: 'Po %s',
        }
    },
    {
        lunchQuestionRegExp: /what('s|is) for (dinner|lunch)/i,
        lunchTimeQuestionRegExp: /(when|what time)\s*(is|the)*\s*(dinner|lunch)/i,
        answers: {
            noLunch: [
                'It seems that you did not order anything today.',
                "I can't see anything in orders",
                'Seems like nothing'
            ],
            noNick: [
                "I don't know who you are, sorry :confused:",
                "I don't see you in the orders",
                'You do know that you have to fill in your user name in the orders, right?',
            ],
            lunchTime: 'After %s',
        },
    },
];

var oauth2Client;
var rl;
var lunchtimeTimeout;


function getOAuthCodeFromUrl ()
{
    return new Promise((resolve) => {
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Paste the code here: ', code => {
            rl.close();
            resolve(code);
        });
    });
}

function connectToDrive (client)
{
    if (config.oauth2Token && config.oauth2RefreshToken && config.oauth2TokenExpiryTimestamp)
    {
        client.setCredentials({
            /* eslint-disable camelcase */
            access_token: config.oauth2Token,
            refresh_token: config.oauth2RefreshToken,
            expiry_date: config.oauth2TokenExpiryTimestamp
            /* eslint-enable camelcase */
        });
        return Promise.resolve(oauth2Client);
    }
    else
    {
        let url = client.generateAuthUrl({
            /* eslint-disable camelcase */
            access_type: 'offline',
            scope: [ 'https://www.googleapis.com/auth/spreadsheets.readonly' ],
            approval_prompt: 'force',
            /* eslint-enable camelcase */
        });
        console.log('1. Visit the url:', url);
        console.log('2. Authorize');
        console.log('3. You will be given a code');
        return getOAuthCodeFromUrl().then((code) => {
            client.getToken(code, (err, tokens) => {
                if (err)
                {
                    throw err;
                }
                else
                {
                    client.setCredentials(tokens);
                    config.oauth2Token = tokens.access_token;
                    config.oauth2RefreshToken = tokens.refresh_token;
                    config.oauth2TokenExpiryTimestamp = tokens.expiry_date;
                    fs.writeFile(
                        './config.json',
                        JSON.stringify(config, false, 4)
                    );
                    return Promise.resolve(client);
                }
            });
        });
    }
}

function reconnectOnInvalidAuthKey (error)
{
    if ('Invalid authorization key.' === error.message)
    {
        logger.error(error);
        config.oauth2Token = null;
        config.oauth2RefreshToken = null;
        return connect();
    }
    else
    {
        throw error;
    }
}

function connect ()
{
    return connectToDrive(oauth2Client)
        .catch(reconnectOnInvalidAuthKey);
}

function getValuesFromSheet (sheets, sheetId, range)
{
    return new Promise((resolve, reject) => {
        sheets.spreadsheets.values.get(
            {
                spreadsheetId: sheetId,
                range: range,
            },
            (error, result) => {
                if (error) { reject(error); }
                else { resolve(result.data.values); }
            }
        );
    });
}

async function getLunchesFromSheet (sheets, spreadsheetCfg)
{
    // Mon=0 … Sun=6
    const dayIdx = ((new Date()).getDay() + 6) % 7;
    const lunches = new Map();
    const [nicks] = await getValuesFromSheet(
        sheets,
        spreadsheetCfg.id,
        spreadsheetCfg.nicksRange
    );
    const allLunches = await getValuesFromSheet(
        sheets,
        spreadsheetCfg.id,
        spreadsheetCfg.range
    );
    nicks.forEach((nick, nickIdx) => {
        if (/^-?$/.test(nick))
        {
            return;
        }
        if (allLunches[dayIdx] === undefined)
        {
            return;
        }
        lunches.set(nick, allLunches[dayIdx][nickIdx]);
    });
    return lunches;
}

async function getLunchesFromAllSheets ()
{
    const authdClient = await connect();
    const sheets = google.sheets({version: 'v4', auth: authdClient});

    return Promise.all(
        config.lunch.spreadsheets.map(
            spreadsheetCfg => getLunchesFromSheet(sheets, spreadsheetCfg)
        )
    )
        .then(lunchesBySheet => {
            const lunches = new Map();
            for (let sheetLunches of lunchesBySheet)
            {
                sheetLunches.forEach((lunch, nick) => {
                    if (! lunches.has(nick))
                    {
                        lunches.set(nick, lunch);
                    }
                    else
                    {
                        lunches.set(nick, [lunches.get(nick), lunch].join('\n'));
                    }
                });
            }
            return lunches;
        });
}

function getLunches ()
{
    if (lunchCache.timestamp > Date.now() - REFRESH_RATE_MS)
    {
        return Promise.resolve(lunchCache.items);
    }
    else
    {
        return getLunchesFromAllSheets()
            .then((lunches) => {
                lunchCache.items = lunches;
                lunchCache.timestamp = Date.now();
                return lunches;
            });
    }
}

function getLunch (nick)
{
    return getLunches().then((lunches) => {
        let lunch = lunches.get(nick);
        if (! lunch && null !== lunch)
        {
            throw undefined;
        }
        return lunch;
    });
}


function onOpen ()
{
    oauth2Client = new google.auth.OAuth2(
        config.oauthClientId,
        config.oauthClientSecret,
        'urn:ietf:wg:oauth:2.0:oob'
    );



    // try to fetch, fill up the cache
    getLunches()
        .then(lunches => {
            if (lunches.size)
            {
                log('Lunches, at the moment:');
                lunches.forEach((lunch, nick) => {
                    log('- @' + nick + ': ' + lunch);
                });
            }
            else
            {
                log('No lunches, at the moment.');
            }
        })
        .catch(error => {
            logger.error(error);
        });
}


function onMessage (event)
{
    var handled;

    l18n.forEach(texts => {
        if (texts.lunchQuestionRegExp.test(event.normalizedText))
        {
            handled = true;
            getLunch(event.userName)
                .then(lunch => {
                    if (!lunch)
                    {
                        event.respond(texts.answers.noLunch);
                    }
                    else
                    {
                        event.respond(lunch);
                    }
                })
                .catch(error => {
                    event.respond(texts.answers.noNick);
                    logger.error(error);
                });
        }
        else if (texts.lunchTimeQuestionRegExp.test(event.normalizedText))
        {
            var answer = texts.answers.lunchTime
                .replace('%s', config.lunch.time);
            handled = true;

            event.respond(answer);
        }
    });

    return handled;
}

function register (backend)
{
    backend.eventEmitter.on('open', onOpen);
    backend.eventEmitter.on('open', msgLunchesAtLunchTime.bind(null, backend));
    backend.eventEmitter.on('directedmessage', onMessage);
    backend.eventEmitter.on('generalmessage', onMessage);
}


function msgLunchesAtLunchTime (backend)
{
    let now = new Date();
    let h, m;
    let ms;

    if (! config.lunch.time)
    {
        return;
    }

    [h, m] = (config.lunch.time + ':0').split(':');

    ms = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0) - now;
    // If already after lunch time, add a day
    // leave a second marigin to make sure we don’t schedule for “now”
    if (ms < 1000)
    {
        ms += 24*60*60*1000;
    }
    log('Next lunch time is:', new Date(+now + ms));

    clearTimeout(lunchtimeTimeout);
    lunchtimeTimeout = setTimeout(
        () => {
            // schedule the next day
            msgLunchesAtLunchTime(backend);
            msgTodaysLunches(backend);
        },
        ms
    );
}


function msgTodaysLunches (backend)
{
    return getLunches()
        .then(lunches => {
            lunches.forEach((lunch, nick) => {
                if (lunch)
                {
                    backend.messageUser(nick, lunch + ', bon appétit :smile:');
                }
            });
        });
}



// Add link to the spreadcheets to error messages
l18n.forEach(texts => {
    var urls = config.lunch.spreadsheets.map(
        cfg => 'https://docs.google.com/spreadsheets/d/' + cfg.id
    ).join('\n');
    for (let id in texts.answers)
    {
        if (/^no[A-Z]/.test(id))
        {
            texts.answers[id] = texts.answers[id].map(answer => {
                return answer + '\n' + urls;
            });
        }
    }
});

module.exports = {
    register: register
};
