'use strict';

const qa = new Map();

function onMessage (event)
{
    var handled = false;
    qa.forEach((answers, questionRegExp) => {
        if (questionRegExp.test(event.normalizedText))
        {
            event.respond(answers);
            handled = true;
        }
    });
    return handled;
}

function register (backend)
{
    backend.eventEmitter.on('directedmessage', onMessage);
}

// welcome
qa.set(/^(czesc|(dzien\s+)?dobry|siema|witam|witaj)\W*$/i, [
    'cześć',
    'dzień dobry',
    'yo',
    'witam',
    '\'ello'
]);
qa.set(/^(hi|hello|welcome)\W*$/i, [
    'hi',
    'hello',
    '\'ello'
]);
// pings
qa.set(/^\W*ping\W*$/i, [
    'pong'
]);
// thanks
qa.set(/^(dziek(uje|i|kuwa|s))\W*$/i, [
    'nie ma za co',
    'nie ma sprawy'
]);
qa.set(/^(thank\s+you|thanks)\W*$/i, [
    "don't mention it"
]);
// abuse
qa.set(/^(jestes\s+glupia?\W*)$/i, [
    ':cry:'
]);
qa.set(/^((you|U)(\'re|\s+are|\s*R)\s+stupid)\W*$/i, [
    ':cry:'
]);
qa.set(/^(spierdalaj|umrzyj|ty\s+chuju)\W*$/i, [
    ':cry:'
]);
qa.set(/^(fuck\s+(you|off))\W*$/i, [
    ':cry:'
]);
// hate
qa.set(/^(nienawidze\s+cie)\W*$/i, [
    'przykro mi to słyszeć'
]);
qa.set(/^(hate\s+you)\W*$/i, [
    'sorry to hear that'
]);
// emotions
qa.set(/:-?\(|:(disappointed):/i, [
    'nie smuć się'
]);
qa.set(/;-?\(|:(cry|crying_cat_face):/i, [
    'nie płacz…'
]);
qa.set(/^\W*:(simple_)?smiley?(_cat)?:\W*$/i, [
    ':smile:',
    ':smile_cat:',
    ':simple_smile:'
]);

module.exports = {
    register: register
};
