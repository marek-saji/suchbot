'use strict';

// TODO if an handler returns a Promise, pause execution of next
//      handler. and enable stopping propagation.

// const EventEmitter = require('events');
//
// module.exports = new EventEmitter();

const log = require('./log');

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


function lunchListener (queue, event, index)
{
    index = index|0;
    if (! queue[index])
    {
        return Promise.resolve(false);
    }
    else
    {
        return (new Promise(
            resolve => resolve(queue[index](event))
        ))
            .then(function (index, handled) {
                return handled || lunchListener(queue, event, index+1)
            }.bind(null, index))
    }
}

function emit (name, event)
{
    let queue = queues.get(name) || [];
    lunchListener(queue, event)
        .catch(error => {
            log.error('Error in', name, 'event listener:', error.stack);
        });
}

module.exports = {
    on: add,
    emit: emit
};
