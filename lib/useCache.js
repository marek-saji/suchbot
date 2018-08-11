const storage = new Map();

const TTL_MS = 5 * 60 * 1000;

const isStale =
    (cache) => (Date.now() - cache.date.getTime()) > TTL_MS;

const useCache = (func) => (...argv) => {
    if (! storage.has(func))
    {
        storage.set(func, new Map());
    }
    const funcCache = storage.get(func);

    const cacheKey = argv.join('\0');
    if (! funcCache.has(cacheKey) || isStale(funcCache.get(cacheKey)))
    {
        funcCache.set(
            cacheKey,
            {
                date: new Date,
                value: func(...argv),
            }
        );
    }

    return funcCache.get(cacheKey).value;
};

module.exports = useCache;
