'use strict';

const log = require('../log');
const config = require('../../config.json');

const plugins = new Map();

config.plugins
    .forEach(name => plugins.set(name, require('../plugins/' + name)));

function register (eventEmitter)
{
    plugins.forEach((plugin, name) => {
        let event = {
            config: config
        };
        log('plugins', 'Registering plugin:', name);
        plugin.register(eventEmitter);
    });
}

module.exports = {
    register: register
};
