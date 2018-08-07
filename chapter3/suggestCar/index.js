const Alexa = require('alexa-sdk');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const cars = [
    { name: 'fiat500', size: 'small', cost: 'luxury', doors: 3, gears: '' },
    { name: 'fordFiesta', size: 'small', cost: 'luxury', doors: 5, gears: '' },
    { name: 'hyundaiI20', size: 'small', cost: 'value', doors: 3, gears: '' },
    { name: 'peugeot208', size: 'small', cost: 'value', doors: 5, gears: '' },

    { name: 'vauxhallAstra', size: 'medium', cost: 'value', doors: 5, gears: '' },
    { name: 'vwGolf', size: 'medium', cost: 'luxury', doors: 5, gears: '' },

    { name: 'scodaOctaviaAuto', size: 'large', cost: 'value', doors: 5, gears: 'automatic' },
    { name: 'fordCmax', size: 'large', cost: 'value', doors: 5, gears: 'manual' },
    { name: 'mercedesEClass', size: 'large', cost: 'luxury', doors: 5, gears: 'automatic' },
    { name: 'Vauxhall Insignia', size: 'large', cost: 'luxury', doors: 5, gears: 'manual' }
];


const handlers = {
    'LaunchRequest': function() {
        this.emit(':ask', `Hi there, I'm Car Helper. You can ask me to suggest a car for you.`);
    },

    'whichCar': function() {
        const { slots } = this.event.request.intent;

        const { size, cost, gears, doors } = slots;

        if (!size || !(size === 'large' || size === 'medium' || size == 'small')) {
            const slotToElicit = 'size';
            const speechOutput = 'What size car do you want? Please say either small, medium or large.';
            const repromptSpeech = 'What size car do you want?';
            return this.emit(':elicitSlot', slotToElicit, speechOutput, repromptSpeech);
        }

        if (!cost || !(cost === 'luxury' || cost === 'value')) {
            const slotToElicit = 'cost';
            const speechOutput = 'Are you looking for a luxury or value car?';
            return this.emit(':elicitSlot', slotToElicit, speechOutput);
        }

        if (size === 'large' && (!gears || !(gears === 'automatic' || gears === 'manual'))) {
            // missing or incorrect gears
            const slotToElicit = 'gears';
            const speechOutput = 'Do you want an automatic or a manual transmission?';
            return this.emit(':elicitSlot', slotToElicit, speechOutput);
        }

        if (size === 'small' && (!doors || !(doors == 3 || doors == 5))) {
            // missing or incorrect doors
            const slotToElicit = 'doors';
            const speechOutput = 'Do you want 3 or 5 doors?';
            return this.emit(':elicitSlot', slotToElicit, speechOutput);
        }

        // find the ideal car
        let chosenCar = cars.filter(car => {
            return (car.size === size && car.cost === cost &&
                (gears ? car.gears === gears : true) &&
                (doors ? car.doors === doors : true));
        });

        if (chosenCar.length !== 1) {
            return this.emit(':tell', `Unfortunately I couldn't find the best car for you. You can say "suggest a car" if you want to try again.`);
        }

        var params = {
            Bucket: 'car-data-sam',
            Key: `${chosenCar[0].name}.json`
        };

        return s3.getObject(params, function(err, data) {
            if (err) { // an error occurred
                console.log(err, err.stack);
                return handleS3Error(err);
            } else { // successful response
                console.log(data);
                return handleS3Data(data);
            }
        });

    }

};

const handleS3Error = error => {
    return this.emit(':tell', `Unfortunately I couldn't find the best car for you. You can say "suggest a car" if you want to try again.`);
};


function handleS3Data(data) {
    let body = JSON.parse(data.Body);
    console.log('body= ', body);
    let { make, model, rrp, fuelEcon, dimensions, NCAPSafetyRating, cargo } = body;
    let speech = `I think that a ${make} ${model} would be a good car for you. 
    They're available from ${rrp} pounds, get ${fuelEcon} and have a ${cargo} litre boot.`;
    return this.emit(':tell', speech);
}

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.appId = 'amzn1.ask.skill.503149e3-1591-4c91-9ff2-ba5bc5d1df2d';
    alexa.registerHandlers(handlers);
    alexa.execute();
};