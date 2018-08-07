const Alexa = require('alexa-sdk');

let welcomeMessage = ''

const handlers = {
    'LaunchRequest': function() {
        this.emit(':ask', welcomeMessage);
    },
};

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.appId = APP_ID
    alexa.registerHandlers(handlers);
    alexa.execute();
};