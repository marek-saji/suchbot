const transliterate = require('transliteration').transliterate;
const escRE = require('escape-string-regexp')


function mapNamesToNicks (nickToNamesMap, names)
{
    const nameToNick = new Map();
    const normalize = n => (
        transliterate(n)
            .trim()
            .toLowerCase()
            .replace(/[',]+/g, '')
            .replace(/[^\w]+/g, ' ')
    );

    // Map(regexp => [name, …])
    let regExpToNames = new Map();
    for (const name of names)
    {
        const normalizedName = normalize(name);
        const normalizedNameParts = normalizedName.split(' ');
        const firstPart = normalizedNameParts[0];
        const nameRegExps = new Set();

        const firstRegExp = escRE(firstPart);
        nameRegExps.add(firstRegExp);

        if (normalizedNameParts.length > 1)
        {
            const lastPart = normalizedNameParts[normalizedNameParts.length - 1];
            const lastRegExp = escRE(lastPart);
            nameRegExps.add(firstRegExp + '\\b.*\\b' + lastRegExp);
            nameRegExps.add(lastRegExp + '\\b.*\\b' + firstRegExp);
            nameRegExps.add(lastRegExp);
        }

        if (normalizedNameParts.length > 2)
        {
            nameRegExps.add(escRE(normalizedName));
        }

        for (const regExp of nameRegExps)
        {
            let regExpNames;
            if (! regExpToNames.has(regExp))
            {
                regExpNames = [];
                regExpToNames.set(regExp, regExpNames);
            }
            else
            {
                regExpNames = regExpToNames.get(regExp);
            }
            regExpNames.push(name);
        }
    }


    // Remove all etnries with multiple names
    const regExpToName = new Map(
        Array.from(regExpToNames.entries())
            .filter(([, names]) => names.length === 1)
            .map(([regExp, [name]]) => ([regExp, name]))
    );


    // Exec
    for (const [regExpString, name] of regExpToName)
    {
        const regExp = new RegExp('(^|\\b)' + regExpString + '(\\b|$)');
        let matches = [];
        for (const [nick, namesForNick] of nickToNamesMap)
        {
            for (const name of namesForNick.map(normalize))
            {
                if (regExp.test(name))
                {
                    matches.push(nick);
                    break;
                }
            }
        }
        if (matches.length === 1)
        {
            nameToNick.set(name, matches[0]);
        }
    }

    return nameToNick;
}

module.exports = mapNamesToNicks;
