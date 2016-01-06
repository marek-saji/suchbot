'use strict';

const log = require('./log');
const config = require('../config.json');
const eventEmitter = require('./eventEmitter');

const plugins = new Map();

config.plugins
    .forEach(name => plugins.set(name, require('../plugins/' + name)));

plugins.forEach((plugin, name) => {
    let event = {
        config: config
    };
    log('Registering plugin:', name);
    plugin.register(eventEmitter);
});

module.exports = plugins;
