'use strict';

const qa = new Map();

function onMessage (backend, event)
{
    var handled = false;
    qa.forEach((answer, questionRegExp) => {
        if (questionRegExp.test(event.normalizedText))
        {
            event.respond(answer(backend));
            handled = true;
        }
    });
    return handled;
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
qa.set(/^(what( is|'?s) (your|ur|yr) name|who (are|r) ?(you|u))\??$/i, (backend) => [
    backend.nick,
    "I'm " + backend.nick,
    'They call me ' + backend.nick,
    'Friends call me ' + backend.nick,
    "I'm " + backend.nick + '. ' + backend.nick + ' ' + backend.nick
]);
qa.set(/^(jak sie nazywasz|ci (.*dali )na imie|jakie jest twoje imie|jak cie zwa|ktos? ty|kim jestes)\??$/i, (backend) => [
    backend.nick,
    'Jestem ' + backend.nick,
    'Mam na imię ' + backend.nick,
    'Przyjaciele mówią mi ' + backend.nick,
    'Zowią mnie ' + backend.nick,
    'Mówią mi mnie ' + backend.nick
]);
// place
qa.set(/^where (are|r)? ?(you|u)\??$/i, () => 'On ' + process.platform);
qa.set(/^(gdzie|skad) (jestes|klikasz)\??$/i, () => process.platform);
// age
qa.set(/^(how old ?(are|r)? ?(you|u)?|when('s| is|) (ur|your) (bday|birthday|birth day)|where were (you|u) born)\??$/i, () => "I'm " + getAge());
qa.set(/^(ile masz lat|jak[ia] (star[ya] jestes|(jest )?(twoj )?wiek)|kiedy sie urodzil][ae]s|kiedy (masz|sa( twoje)?) urodziny)\??$/i, () => 'Mam ' + getAge());

module.exports = {
    register: register
};
