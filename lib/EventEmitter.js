'use strict';

const log = require('./log');

module.exports = class EventEmitter {

    constructor ()
    {
        this.queues = new Map();
    }

    on (name, handler)
    {
        let queue;
        queue = this.queues.get(name);
        if (! queue)
        {
            queue = [];
            this.queues.set(name, queue);
        }

        queue.push(handler);
    }


    lunchListener (queue, event, index)
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
                    return handled || this.lunchListener(queue, event, index+1)
                }.bind(this, index))
        }
    }

    emit (name, event)
    {
        let queue = this.queues.get(name) || [];
        this.lunchListener(queue, event)
            .catch(error => {
                log.error('Error in', name, 'event listener:', error.stack);
            });
    }
};
