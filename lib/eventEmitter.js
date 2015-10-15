'use strict';

// TODO if an handler returns a Promise, pause execution of next
//      handler. and enable stopping propagation.

// const EventEmitter = require('events');
//
// module.exports = new EventEmitter();

const queues = new Map();

function add (name, handler)
{
    let queue;
    queue = queues.get(name);
    if (! queue)
    {
        queue = [];
        queues.set(name, queue);
    }

    queue.push(handler);
}

function emit (name, event)
{
    let queue = queues.get(name) || [];
    let promise = Promise.resolve(true);
    for (let i in queue)
    {
        promise = promise.then(() => {
            return new Promise((resolve, reject) => {
                Promise.resolve(queue[i](event)).then(result => {
                    result ? reject() : resolve();
                });
            })
        });
    }
}

module.exports = {
    on: add,
    emit: emit
};
