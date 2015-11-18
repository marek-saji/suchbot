'use strict';

// TODO change to sync
// TODO use fs.readSync(stdin.fd, buffer, 0, BUF_SIZE) instead of rl
// TODO add module that loads config or creates one from template using this

const readline = require('readline');
const fs = require('fs');

const numberRegExp = /[0-9]*\.?[0-9]+|[0-9]+\.?[0-9]*/;
const nonStringValues = {'null': null, 'true': true, 'false': false};

const lineHandlers = new Map();

lineHandlers.set(/\s*\/\/ (.*)$/, (matches, rl, output) => {
    console.log(matches[1]);
    return output;
});
lineHandlers.set(/\s*"(.*)": (.*?),?$/, (matches, rl, output) => {
    return new Promise(resolve => {
        let def = matches[2];
        let question = matches[1] + '? ';
        if ('null' !== def)
        {
            question += '[' + def + '] ';
        }
        if ('"' === def[0] && '"' === def[def.length-1])
        {
            def = def.substr(1, def.length-2);
        }
        rl.question(question, answer => {
            answer = answer || def;
            if (numberRegExp.test(answer))
            {
                answer = Number(answer);
            }
            else if (nonStringValues.hasOwnProperty(def))
            {
                if (nonStringValues.hasOwnProperty(answer))
                {
                    answer = nonStringValues[answer];
                }
            }
            output[ matches[1] ] = answer;
            resolve(output);
        });
    });
});

function handleLine (line, rl, output)
{
    return new Promise((resolve) => {
        var handled = false;
        lineHandlers.forEach((handler, regexp) => {
            let matches;
            if (!handled)
            {
                matches = line.match(regexp);
                if (matches)
                {
                    resolve(handler(matches, rl, output));
                }
            }
        });
        if (!handled)
        {
            resolve(true);
        }
    });
}


function configCreator (templatePath)
{
    let template = String(fs.readFileSync(templatePath)).split(/\n\r?|\r/);
    let output = {};

    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });


    let handleLines = template.reduce(
        (promise, line) => promise.then(handleLine.bind(null, line, rl, output)),
        Promise.resolve(true)
    );

    return handleLines
        .then(() => {
            rl.close();
            console.log(JSON.stringify(output, false, 4));
        });
}

configCreator('./config.json.template');
module.exports = configCreator;
