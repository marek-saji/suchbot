'use strict';

const config = require('./config.json');

const plugins = require('./lib/plugins');
const EventEmitter = require('./lib/EventEmitter');
const Backend = require('./lib/Backend');

const backends = {};

for (let backendName in config.backends)
{
    let backendConfig = config.backends[ backendName ];
    let backendType = backendConfig.type;
    let ThisBackend;
    let eventEmitter;

    eventEmitter = new EventEmitter();;

    plugins.register(eventEmitter);

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
        backendConfig
    );
}
