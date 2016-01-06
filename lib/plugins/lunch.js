'use strict';

const REFRESH_RATE_MS = 5 * 60 * 1000;

const fs = require('fs');
const readline = require('readline');

const googleSpreadsheets = require('google-spreadsheets');
const google = require('googleapis');

const log = require('../log');
const config = require('../../config.json');

const lunchCache = {
    timestamp: null,
    items: new Map()
};

const l18n = [
    {
        questionRegExp: /co .*na (obiad|lunch|lancz)/i,
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
            ]
        }
    },
    {
        questionRegExp: /what('s|is) for (dinner|lunch)/i,
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
            ]
        },
    },
];

var oauth2Client;
var rl;


function getOAuthCodeFromUrl ()
{
    return new Promise((resolve, reject) => {
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Paste the code here: ', url => {
            rl.close();
            resolve(url);
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
            scope: [ 'https://www.googleapis.com/auth/drive' ],
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

function connectToSpreadsheets (client)
{
    return new Promise((resolve, reject) => {
        googleSpreadsheets(
            {
                key: config.lunchSpreadsheetId,
                auth: client
            },
            (err, spreadsheet) => {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(spreadsheet);
                }
            }
        );
    });
}

function reconnectOnInvalidAuthKey (error)
{
    if ('Invalid authorization key.' === error.message)
    {
        log.error(error);
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
        .then(connectToSpreadsheets)
        .catch(reconnectOnInvalidAuthKey);
}

function getSheetRange (client, sheet, range)
{
    return new Promise((resolve, reject) => {
        sheet.cells(
            {range: range},
            (err, data) => {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(data.cells);
                }
            }
        );
    });
}

function getLunchesFromSheet ()
{
    return connect()
        .then((spreadsheet) => {
            let worksheet;
            let getLunchSheetRange;

            worksheet = spreadsheet.worksheets.find(w => {
                return w.id === config.lunchSheetId;
            });

            if (! worksheet)
            {
                throw new Error('Worksheet with id=' + config.lunchSheetId + ' not found.');
            }

            getLunchSheetRange = getSheetRange.bind(
                null,
                oauth2Client,
                worksheet
            );

            return getLunchSheetRange(config.lunchCellsNicksRange)
                .then((cells) => {
                    let nicks = new Map();

                    for (let row in cells)
                    {
                        for (let col in cells[row])
                        {
                            let nick = cells[row][col].value;
                            if (nick)
                            {
                                nicks.set(col, nick);
                            }
                        }
                        // should be just one, so ignore the rest
                        break;
                    }

                    log('Got ' + nicks.size + ' nick names from lunch spreadsheet.');
                    return nicks;
                })
                .then((nicks) => {
                    return getLunchSheetRange(config.lunchCellsRange)
                        .then(lunchCells => {
                            return [nicks, lunchCells];
                        });
                })
                .then((nicksAndLunchesCells) => {
                    let row;
                    let nicks = nicksAndLunchesCells[0];
                    let lunchCells = nicksAndLunchesCells[1];
                    let lunches = new Map();

                    // TODO read that "6" from config
                    row = 6 + ((new Date()).getDay() - 1) % 7;

                    for (let col of nicks.keys())
                    {
                        let lunch =
                            lunchCells &&
                            lunchCells[row] &&
                            lunchCells[row][col] &&
                            lunchCells[row][col].value;
                        if ('-' === lunch || !lunch)
                        {
                            lunch = null;
                        }
                        lunches.set(nicks.get(col), lunch);
                    }

                    log('Got ' + lunches.size + ' lunches from lunch spreadsheet.');
                    return lunches;
                });
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
        return getLunchesFromSheet()
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
            log('Lunches, at the moment:');
            lunches.forEach((lunch, nick) => {
                log('- @' + nick + ': ' + lunch);
            });
        })
        .catch(error => {
            log.error(error);
        });
}


function onMessage (event)
{
    var handled;

    l18n.forEach(texts => {
        if (texts.questionRegExp.test(event.normalizedText))
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
                    log.error(error);
                });
        }
    });

    return handled;
}

function register (eventEmitter)
{
    eventEmitter.on('open', onOpen);
    eventEmitter.on('directedmessage', onMessage);
    eventEmitter.on('generalmessage', onMessage);
}

l18n.forEach(texts => {
    var url = 'https://docs.google.com/spreadsheets/d/' + config.lunchSpreadsheetId;
    for (let id in texts.answers)
    {
        texts.answers[id] = texts.answers[id].map(answer => {
            return answer + '\n' + url;
        });
    }
});

module.exports = {
    register: register
};
