'use strict';

const http = require('http');

const URI = 'http://www.howmanypeopleareinspacerightnow.com/peopleinspace.json';

const l18n = [
    {
        questionRegExp: /how\s+many\s+people\s+((are|r)\s+(there\s+)?)?in\s+space/i,
        answers: {
            fetchError: [
                "Can't tell you right now."
            ]
        }
    },
    {
        questionRegExp: /il[eu]\s+((jest|teraz|ludzi)\s+){2,3}w\s+kosmosie/i,
        answers: {
            fetchError: [
                'Nie mogę teraz odpowiedzieć.'
            ]
        }
    }
];


function getNumber ()
{
    return new Promise((resolve, reject) => {
        http
            .get(URI, (response) => {
                var body = '';
                if (200 !== response.statusCode)
                {
                    reject(new Error('Unexpected status code: ' + response.statusCode));
                }
                else
                {
                    response.on('data', (chunk) => body += chunk);
                    response.on('end', () => {
                        try
                        {
                            resolve(JSON.parse(body).number);
                        }
                        catch (error)
                        {
                            reject(error);
                        }
                    });
                }
            })
            .on('error', error => reject(error));
    });
}

function onMessage (event)
{
    var handled = false;
    l18n.forEach(texts => {
        if (texts.questionRegExp.test(event.normalizedText))
        {
            getNumber()
                .then(number => event.respond(number))
                .catch(() => event.respond(texts.answers.fetchError));
            handled = true;
        }
    });
    return handled;
}

function register (backend)
{
    backend.eventEmitter.on('directedmessage', onMessage);
    backend.eventEmitter.on('message', onMessage);
}

getNumber();

module.exports = {
    register: register
};
