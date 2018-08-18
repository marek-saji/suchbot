const storage = new Map();

const TTL_MS = 5 * 60 * 1000;

const isStale =
    (cache) => (Date.now() - cache.date.getTime()) > TTL_MS;

const pruneStaleEntires = (storage) => {
    storage.forEach((value, key) => {
        if (isStale(value))
        {
            storage.delete(key);
        }
    });
};

const getCachedValue = (storage, cacheKey) => {
    for (const [key, cacheEntry] of storage.entries())
    {
        if (key.length === cacheKey.length)
        {
            let matches = true;
            for (let i = 0; i < key.length; i += 1)
            {
                if (key[i] !== cacheKey[i])
                {
                    matches = false;
                    break;
                }
            }

            if (matches)
            {
                return cacheEntry.value;
            }
        }
    }

    return undefined;
};

const useCache = (func) => (...argv) => {
    pruneStaleEntires(storage);
    const cacheKey = [func, ...argv];
    let value = getCachedValue(storage, cacheKey);

    if (value === undefined)
    {
        value = func(...argv);
        storage.set(
            cacheKey,
            {
                date: new Date,
                value
            }
        );
    }

    return value;
};

module.exports = useCache;
