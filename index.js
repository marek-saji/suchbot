'use strict';

const config = require('./config.json');

const EventEmitter = require('./lib/EventEmitter');
const plugins = require('./lib/plugins');

const backendEngines = {};
const backends = {};

for (let backendName in config.backends)
{
    let backendConfig = config.backends[ backendName ];
    let backendType = backendConfig.type;
    let eventEmitter;

    if (undefined === backendEngines[ backendType ])
    {
        backendEngines[backendType] = require('./lib/backends/' + backendType);
    }

    eventEmitter = new EventEmitter();

    plugins.register(eventEmitter);

    backends[backendName] = backendEngines[backendType].start(
        backendName,
        backendConfig,
        eventEmitter
    );
}
