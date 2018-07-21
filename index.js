'use strict';

const config = require('./config.json');

const EventEmitter = require('./lib/EventEmitter');
const Backend = require('./lib/Backend');

const plugins = new Map();
const backends = {};

config.plugins
    // eslint-disable-next-line global-require
    .forEach(name => plugins.set(name, require('./lib/plugins/' + name)));

for (let backendName in config.backends)
{
    let backendConfig = config.backends[ backendName ];
    let backendType = backendConfig.type;
    let ThisBackend;
    let eventEmitter;

    eventEmitter = new EventEmitter();

    // eslint-disable-next-line global-require
    ThisBackend = require('./lib/backends/' + backendType);
    if (
        ! ThisBackend ||
        ! ( ThisBackend.prototype instanceof Backend )
    )
    {
        throw new Error('Loaded backend name="' + backendName + '", type="' + backendType + '", but is not instanceo of Backend');
    }
    backends[backendName] = new ThisBackend(
        backendName,
        eventEmitter,
        plugins,
        backendConfig
    );
}
