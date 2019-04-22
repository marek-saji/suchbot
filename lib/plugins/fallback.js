const fs = require('fs');
const config = require('../../config.json');
const logger = require('../log');
const log = logger.bind(logger, 'fallback');

const LOG_FN = config.fallback && config.fallback.log;

const answers = [
    'what?',
    'Does not compute',
    'lol, dunno',
    'I have no idea what you mean by that'
];

function onMessage (event)
{
    event.respond(answers);
    logUnhandled(event);
    return true;
}

function register (backend)
{
    backend.eventEmitter.on('directedmessage', onMessage);
}

function logUnhandled (event)
{
    if (LOG_FN)
    {
        fs.appendFile(
            LOG_FN,
            [
                (new Date).toISOString(),
                event.backend.type,
                event.backend.name,
                event.here,
                event.userName,
                event.text,
            ].join('\t') + '\n',
            (error) => {
                if (error)
                {
                    log('Error while appending to log file:', error);
                }
            }
        );
    }
}

module.exports = {
    register: register
};
