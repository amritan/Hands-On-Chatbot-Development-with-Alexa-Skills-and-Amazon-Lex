const Alexa = require('alexa-sdk');

const handlers = {
    'hello': function() {
        //emit response directly
        this.emit(':tell', `Hello from Sam's new intent!`);
    }
};

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.appId = APP_ID
    alexa.registerHandlers(handlers);
    alexa.execute();
};