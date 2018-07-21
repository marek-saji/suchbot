'use strict';

const logger = require('../log');
const log = logger.bind(logger, 'wolfram');
const config = require('../../config');
const createWolfram = require('wolfram-alpha-api');
const wolfram = createWolfram(config.wolfram.appId);

function onMessage (event)
{
    return wolfram.getSpoken(event.text)
        .then((result) => {
            event.respond(
                result.replace(/^The answer is |^/, 'Wolfram says: ')
            );
            return true;
        })
        .catch((error) => {
            log('wolfram did not handle the query:', error);
            return false;
        });
}

function register (backend)
{
    backend.eventEmitter.on('directedmessage', onMessage);
}

module.exports = {
    register: register
};
