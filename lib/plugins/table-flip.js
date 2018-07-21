'use strict';

// https://cutekaomoji.com/misc/table-flipping/
const CHEEK_LEFT = ['(', '(('];
const ARM = ['╯', '┛', 'ﾉ', 'ノ'];
const AFTER_ARM = ['´', ''];
const EYE = ['°', '◉', '>', '<', '≧', '≦', 'ಠ', 'ರ', 'ಸ', '･', 'ಥ', 'ಥ,', '✧', '`', 'T', ''];
const MOUTH = ['□', 'Д', '∇', '益', '~', '_', 'ω', '｣', '_｣', 'Д', 'o', 'O'];
const CHEEK_RIGHT = [')', '))', '）'];
const SWOOSH = ['︵', '彡', 'ﾐ'];
const TABLE = ['┻━┻', '┸━┸', '┻┻'];
const REGEXP = new RegExp([
    joinRegExp(CHEEK_LEFT),
    joinRegExp(ARM),
    joinRegExp(AFTER_ARM),
    joinRegExp(EYE),
    joinRegExp(MOUTH),
    joinRegExp(EYE),
    joinRegExp(CHEEK_RIGHT),
    joinRegExp(ARM),
    joinRegExp(AFTER_ARM),
    joinRegExp(SWOOSH),
    joinRegExp(TABLE),
].join(' *'));
const TABLE_SET = '┬──┬ ノ( ゜-゜ノ)';

function joinRegExp (elements)
{
    return (
        '( *' +
        // eslint-disable-next-line no-useless-escape
        elements.map(e => e.replace(/[()\\\/]/g, '\\$&')).join('|') +
        ' *)'
    );
}

function randomElement (array)
{
    return array[ ~~ (Math.random() * array.length) ];
}

function generateTableFlip ()
{
    const arm = randomElement(ARM);
    const eye = randomElement(EYE);
    return [
        randomElement(CHEEK_LEFT),
        arm,
        Math.random() > 0.9 ? randomElement(AFTER_ARM) : '',
        eye,
        randomElement(MOUTH),
        eye,
        randomElement(CHEEK_RIGHT),
        arm,
        Math.random() > 0.8 ? randomElement(AFTER_ARM) : '',
        randomElement(SWOOSH),
        randomElement(TABLE),
    ].join('');
}

function onMessage (event)
{
    if (! REGEXP.test(event.text))
    {
        return false;
    }

    let response;
    if (Math.random() > 0.5)
    {
        response = TABLE_SET;
    }
    else
    {
        response = generateTableFlip();
    }
    event.react(response);

    return true;
}

function register (backend)
{
    backend.eventEmitter.on('directedmessage', onMessage);
    backend.eventEmitter.on('generalmessage', onMessage);
}

module.exports = {
    register: register
};
