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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const lunches = {
    timestamp: null,
    items: new Map()
};


function getOAuth2Token (client, callback) {
    // generate consent page url
    var url;

    if (config.oauth2Token)
    {
        client.setCredentials({
            /* eslint-disable camelcase */
            access_token: config.oauth2Token
            /* eslint-enable camelcase */
        });
        callback();
    }
    else
    {
        url = client.generateAuthUrl({
            /* eslint-disable camelcase */
            access_type: 'offline',
            scope: [ 'https://www.googleapis.com/auth/drive' ]
            /* eslint-enable camelcase */
        });
        console.log('1. Visit the url:', url);
        console.log('2. You will end up at ' + config.oauthRedirectUrl + '?code=<CODE>#');
        rl.question('Paste the code here: ', (code) => {
            rl.close();
            client.getToken(code, (err, tokens) => {
                if (err) { throw err; }
                client.setCredentials(tokens);
                config.oauth2Token = tokens.access_token;
                fs.writeFile(
                    './config.json',
                    JSON.stringify(config, false, 4)
                );
                callback();
            });
        });
    }
}


slack.on('message', event => {
    var user, channel;
    var isFemale;
    var message = 'message' === event.type && event.text;
    var response;
    var lunch;

    console.log('Got', message);

    user = slack.getUserByID(event.user);
    channel = slack.getChannelGroupOrDMByID(event.channel);

    lunch = lunches.items.get(user.name);
    response = '@' + user.name + ': ';


    if (/co .*na (obiad|lunch|lancz)/i.test(message))
    {
        isFemale = user.name.split('.')[0].slice(-1);

        if (lunch === undefined)
        {
            channel.send(response + 'Nie wiem kim jesteś, sorry.');
        }
        else if (!lunch || '-' === lunch)
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
    }

    if (/what('s|is) for (dinner|lunch)/i.test(message))
    {
        isFemale = user.name.split('.')[0].slice(-1);

        if (lunch === undefined)
        {
            channel.send(response + "I don't know who you are, sorry.");
        }
        else if (!lunch || '-' === lunch)
        {
            channel.send(response + 'It seems that you did not order anything today.');
        }
        else
        {
            channel.send(response + lunch);
        }
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

getOAuth2Token(oauth2Client, () => {
    googleSpreadsheets({
        key: config.lunchSpreadsheetId,
        auth: oauth2Client
    }, (googleSpreadsheetsErr, spreadsheet) => {
        var sheet;
        if (googleSpreadsheetsErr)
        {
            throw googleSpreadsheetsErr;
        }
        sheet = spreadsheet.worksheets[config.lunchSheetIndex];

        sheet.cells({
            range: config.lunchCellsNicksRange
        }, (nicksErr, nicksData) => {
            let nicks = new Map();
            if (nicksErr)
            {
                throw nicksErr;
            }
            console.log('Got nick names from lunch spreadsheet.');

            for (let row in nicksData.cells)
            {
                for (let col in nicksData.cells[row])
                {
                    let nick = nicksData.cells[row][col].value;
                    if (nick)
                    {
                        nicks.set(col, nick);
                    }
                }
                // should be just one, so ignore the rest
                break;
            }

            sheet.cells(
                {range: config.lunchCellsRange},
                (lunchesErr, lunchesData) => {
                    var row;
                    if (lunchesErr)
                    {
                        throw lunchesErr;
                    }
                    console.log('Got lunches from lunch spreadsheet.');

                    for (row in lunchesData.cells)
                    {
                        break;
                    }
                    row = Number(row) + dayOfWeekIdx;

                    lunches.items.clear();
                    lunches.timestamp = Date.now();
                    for (let col of nicks.keys())
                    {
                        lunches.items.set(
                            nicks.get(col),
                            lunchesData.cells[row][col].value
                        );
                    }

                    slack.login();
                }
            );
        });

    });
});
