'use strict';

const l18n = [
    {
        questionRegExp: /jaka\s+(?:dzisiaj\s+)?(jest|mamy)?.*pogod[ae]/i,
        answers: [
            'nie wiem, wyjrzyj przez okno'
        ]
    },
    {
        questionRegExp: /what('s|is) for (dinner|lunch)/i,
        answers: [
            'dunno, look out the window'
        ],
    },
];


function onMessage (event)
{
    var handled = false;
    l18n.forEach(texts => {
        if (texts.questionRegExp.test(event.normalizedText))
        {
            event.respond(texts.answers);
            handled = true;
        }
    });
    return handled;
}

function register (eventEmitter)
{
    eventEmitter.on('directedmessage', onMessage);
}

module.exports = {
    register: register
};
