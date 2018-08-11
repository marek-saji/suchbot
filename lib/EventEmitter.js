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


    async lunchListener (queue, event)
    {
        for (let idx in queue)
        {
            // eslint-disable-next-line no-await-in-loop
            const handled = await queue[idx](event);

            if (handled)
            {
                return true;
            }
        }

        return false;
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
