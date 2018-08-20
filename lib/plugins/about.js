'use strict';

const packageConfig = require('../../package.json');

const qa = new Map();

function onMessage (backend, event)
{
    return Promise.all(Array.from(qa.entries()).map(([questionRegExp, answerGetter]) => {
        if (! questionRegExp.test(event.normalizedText))
        {
            return false;
        }

        return answerGetter(backend);
    })).then(results => {
        const responses = results.filter(r => r !== false);
        let handled = false;
        if (0 !== responses.length)
        {
            event.respond(responses[0]);
            handled = true;
        }
        return handled;
    });
}

function register (backend)
{
    backend.eventEmitter.on('directedmessage', onMessage.bind(null, backend));
}

function getAge ()
{
    let age = '';
    let h;
    let m;
    let s = ~~ process.uptime();
    if (s > 59)
    {
        m = ~~ ( s / 60 );
        s -= m * 60;
        if (m > 59)
        {
            h = ~~ ( m / 60 );
            m -= h * 60;
        }
    }
    if (h)
    {
        age += h + 'h ';
    }
    if (h || m)
    {
        age += m + 'min ';
    }

    age += s + 'sec';
    return age.trim();
}

// name
qa.set(
    /^(what( is|'?s) (your|ur|yr) name|who (are|r) ?(you|u))\??$/i,
    backend => backend.getBotNick().then(
        nick => [
            nick,
            "I'm " + nick,
            'They call me ' + nick,
            'Friends call me ' + nick,
            "I'm " + nick + '. ' + nick + ' ' + nick
        ]
    )
);
qa.set(
    /^(jak sie nazywasz|ci (.*dali )na imie|jakie jest twoje imie|jak cie zwa|ktos? ty|kim jestes)\??$/i,
    backend => backend.getBotNick().then(
        nick => [
            'Jestem ' + nick,
            'Mam na imię ' + nick,
            'Przyjaciele mówią mi ' + nick,
            'Zowią mnie ' + nick,
            'Mówią mi mnie ' + nick
        ]
    )
);
// version
qa.set(
    // what is your version
    // what ver are you running
    /^what( is|'?s)( your)? ver(sion)?( are)?( you)?( running| sporting)?\??$/i,
    () => [
        packageConfig.version,
        "I'm " + packageConfig.version,
        "I'm running " + packageConfig.version,
    ]
);
qa.set(
    // jaką masz wersje
    // jaka jest twoja wersja
    // na jakiej wersji działasz
    /^(na )?jak(a|iej)( jest| masz)?( twoja)?( u siebie)? wersj[aei]( dzialasz)?\??$/i,
    () => [
        packageConfig.version,
        "Jestem " + packageConfig.version,
        "Działam na " + packageConfig.version,
    ]
);
// place
qa.set(
    /^where (are|r)? ?(you|u)\??$/i,
    () => 'On ' + process.platform
);
qa.set(
    /^(gdzie|skad) (jestes|klikasz)\??$/i,
    () => process.platform
);
// age
qa.set(
    /^(how old ?(are|r)? ?(you|u)?|when('s| is|) (ur|your) (bday|birthday|birth day)|where were (you|u) born)\??$/i,
    () => "I'm " + getAge()
);
qa.set(
    /^(ile masz lat|jak[ia] (star[ya] jestes|(jest )?(twoj )?wiek)|kiedy sie urodzil][ae]s|kiedy (masz|sa( twoje)?) urodziny)\??$/i,
    () => 'Mam ' + getAge()
);

module.exports = {
    register: register
};
