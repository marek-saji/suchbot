'use strict';

const config = require('./config.json');
const googleSpreadsheets = require('google-spreadsheets');
const Slack = require('slack-client');

const fs = require('fs');
const readline = require('readline');

const google = require('googleapis');
const OAuth2Client = google.auth.OAuth2;

const dayOfWeekIdx = ((new Date()).getDay() - 1) % 7; // monday = 0

const oauth2Client = new OAuth2Client(config.oauthClientId, config.oauthClientSecret, config.oauthRedirectUrl);

const slack = new Slack(config.slackToken, true, true);

var rl;

const lunchCache = {
    timestamp: null,
    items: new Map()
};


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

                    for (row in lunchCells)
                    {
                        break;
                    }
                    row = Number(row) + dayOfWeekIdx;

                    for (let col of nicks.keys())
                    {
                        let lunch = lunchCells[row][col].value;
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
    if (lunchCache.timestamp > Date.now() - 5 * 60)
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
        if (!lunch)
        {
            throw undefined;
        }
        return lunch;
    });
}


slack.on('message', event => {
    var user, channel;
    var isFemale;
    var message = 'message' === event.type && event.text;
    var response;

    console.log('Got', message);

    user = slack.getUserByID(event.user);
    channel = slack.getChannelGroupOrDMByID(event.channel);

    response = '@' + user.name + ': ';


    if (/co .*na (obiad|lunch|lancz)/i.test(message))
    {
        isFemale = user.name.split('.')[0].slice(-1);

        getLunch(user.name)
            .then(lunch => {
                if (!lunch)
                {
                    if (isFemale)
                    {
                        channel.send(response + 'Wygląda na to, że nic dzisiaj nie zamówiłaś');
                    }
                    else
                    {
                        channel.send(response + 'Wygląda na to, że nic dzisiaj nie zamówiłeś');
                    }
                }
                else
                {
                    channel.send(response + lunch);
                }
            })
            .catch((error) => {
                console.log(error.stack);
                channel.send(response + 'Nie wiem kim jesteś, sorry.');
            });
    }

    if (/what('s|is) for (dinner|lunch)/i.test(message))
    {
        isFemale = user.name.split('.')[0].slice(-1);

        getLunch(user.name)
            .then(lunch => {
                if (!lunch)
                {
                    channel.send(response + 'It seems that you did not order anything today.');
                }
                else
                {
                    channel.send(response + lunch);
                }
            })
            .catch(() => {
                channel.send(response + "I don't know who you are, sorry.");
            });
    }
});

slack.on('open', () => {
    var channelNames = [];
    var i;
    for (i in slack.channels)
    {
        if (slack.channels[i].is_member)
        {
            channelNames.push('#' + slack.channels[i].name);
        }
    }
    console.log('Ready to conversate in ' + channelNames.join(', '));
});

slack.on('error', error => {
    console.log(error);
});

slack.login();
getLunches();
