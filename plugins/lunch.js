'use strict';

const REFRESH_RATE_MS = 5 * 60 * 60 * 1000;

const fs = require('fs');
const readline = require('readline');

const googleSpreadsheets = require('google-spreadsheets');
const google = require('googleapis');

const config = require('../config.json');

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
                'Wiesz, że trzeba wpisać nicka ze slacka w zamówieniach?',
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
                'You do know that you have to fill in your slack nick name in the orders, right?',
            ]
        },
    },
];

var oauth2Client;
var rl;



function connectToDrive (client)
{
    return new Promise((resolve, reject) => {
        if (config.oauth2Token)
        {
            client.setCredentials({
                /* eslint-disable camelcase */
                access_token: config.oauth2Token
                /* eslint-enable camelcase */
            });
            resolve(oauth2Client);
        }
        else
        {
            let url = client.generateAuthUrl({
                /* eslint-disable camelcase */
                access_type: 'offline',
                scope: [ 'https://www.googleapis.com/auth/drive' ]
                /* eslint-enable camelcase */
            });
            console.log('1. Visit the url:', url);
            console.log('2. You will end up at ' + config.oauthRedirectUrl + '?code=<CODE>#');
            rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question('Paste the code here: ', (code) => {
                rl.close();
                client.getToken(code, (err, tokens) => {
                    if (err)
                    {
                        reject(err);
                    }
                    else
                    {
                        client.setCredentials(tokens);
                        config.oauth2Token = tokens.access_token;
                        fs.writeFile(
                            './config.json',
                            JSON.stringify(config, false, 4)
                        );
                        resolve(client);
                    }
                });
            });
        }
    });
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
    return connectToDrive(oauth2Client)
        .then(connectToSpreadsheets)
        .catch((error) => {
            if ('Invalid authorization key.' === error.message)
            {
                console.error('Invalid authorization key.');
                // TODO refresh token and try again
                //      why this happens so late?
            }
            else
            {
                console.error(error.stack);
            }
        })
        .then((spreadsheet) => {
            let getLunchSheetRange = getSheetRange.bind(
                null,
                oauth2Client,
                spreadsheet.worksheets[config.lunchSheetIndex]
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

                    console.log('Got ' + nicks.size + ' nick names from lunch spreadsheet.');
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

                    console.log('Got ' + lunches.size + ' lunches from lunch spreadsheet.');
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
        console.log(nick, lunch);
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
        config.oauthRedirectUrl
    );

    // try to fetch, fill up the cache
    getLunches()
        .then((lunches) => {
            console.log('Lunches, at the moment:');
            lunches.forEach((lunch, nick) => {
                console.log('- @' + nick + ': ' + lunch);
            });
        })
        .catch((error) => {
            console.error(error.stack);
        });
}


function onMessage (event)
{
    var handled;

    l18n.forEach(texts => {
        if (texts.questionRegExp.test(event.text))
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
                .catch((stack) => {
                    event.respond(texts.answers.noNick);
                    console.error(error.stack);
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
    var url = 'https://docs.google.com/spreadsheets/' + config.lunchSpreadsheetId;
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
