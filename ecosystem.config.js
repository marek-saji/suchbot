let deployConfig;
try
{
    // eslint-disable-next-line global-require
    deployConfig = require('./ecosystem.config.deploy.js');
}
catch (error)
{
    if (error instanceof Error && error.code === 'MODULE_NOT_FOUND')
    {
        deployConfig = {};
    }
    else
    {
        throw error;
    }
}

module.exports = {
    apps: [
        {
            name: 'suchbot',
            script: 'index.js',
            watch: [
                'index.js',
                'lib',
                'node_modules',
            ],
        }
    ],
    deploy: deployConfig,
};
