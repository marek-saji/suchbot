const answers = [
    'what?',
    'Does not compute',
    'lol, dunno',
    'I have no idea what you mean by that'
];

function onMessage (event)
{
    event.respond(answers);
    return true;
}

function register (backend)
{
    backend.eventEmitter.on('directedmessage', onMessage);
}

module.exports = {
    register: register
};
