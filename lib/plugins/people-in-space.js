'use strict';

const https = require('https');

const URI = 'https://www.howmanypeopleareinspacerightnow.com/peopleinspace.json';

const l18n = [
    {
        questionRegExps: {
            number: /how many people ((are|r) (there )?)?(in space|(outside|off) (earth|world))/i,
            people: /(what people|who) ((are|r|is) (there )?)?(in space|(outside|off) (earth|world))/i,
        },
        answers: {
            fetchError: [
                "Can't tell you right now."
            ]
        }
    },
    {
        questionRegExps: {
            number: /il[eu] ((jest|teraz|ludzi) )+(w kosmosie|poza ziemia)/i,
            people: /kto ((jest|teraz|ludzi) )+(w kosmosie|poza ziemia)/i,
        },
        answers: {
            fetchError: [
                'Nie mogę teraz odpowiedzieć.'
            ]
        }
    }
];


function getData ()
{
    return new Promise((resolve, reject) => {
        https
            .get(URI, (response) => {
                let body = '';
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
                            resolve(JSON.parse(body));
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

async function getNumber ()
{
    return (await getData()).number;
}

function createPeopleListResponse (data)
{
    const peopleByLocation = new Map();
    data.people.forEach(person => {
        const {location} = person;
        if (!peopleByLocation.has(location))
        {
            peopleByLocation.set(location, []);
        }
        peopleByLocation.get(location).push(person);
    });
    const locationTexts = [];
    peopleByLocation.forEach((people, location) => {
        locationTexts.push(
            `on ${location}:\n` + people.map(
                person => `- ${person.name}, ${person.title} (${person.country})`
            ).join('\n')
        );
    });
    return locationTexts.join('\n\n');
}

function onMessage (event)
{
    var handled = false;
    l18n.forEach(texts => {
        if (texts.questionRegExps.number.test(event.normalizedText))
        {
            getNumber()
                .then(event.respond)
                .catch(() => event.respond(texts.answers.fetchError));
            handled = true;
        }
        else if (texts.questionRegExps.people.test(event.normalizedText))
        {
            getData()
                .then(createPeopleListResponse)
                .then(event.respond)
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

getData();

module.exports = {
    register: register
};
