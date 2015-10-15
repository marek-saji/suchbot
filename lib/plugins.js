'use strict';

const config = require('../config.json');
const eventEmitter = require('./eventEmitter');

const plugins = new Map();

[
    'weather',
    'lunch',
    'fallback'
].forEach(name => plugins.set(name, require('../plugins/' + name)));

plugins.forEach((plugin, name) => {
    let event = {
        config: config
    };
    console.log('Registering ' + name + ' plugin');
    plugin.register(eventEmitter);
});

module.exports = plugins;
