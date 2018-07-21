'use strict';

var containers = new Map();

module.exports = function (instance) {
    let container;
    if (! containers.has(instance))
    {
        container = {};
        containers.set(instance, container);
    }
    else
    {
        container = containers.get(instance);
    }

    return container;
};
