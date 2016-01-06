'use strict';

const config = require('./config.json');

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

    // FIXME eventEmitter = new EventEmitter; or sth like that
    eventEmitter = require('./lib/eventEmitter');

    plugins.register(eventEmitter);

    backends[backendName] = backendEngines[backendType].start(
        backendName,
        backendConfig,
        eventEmitter
    );
}
