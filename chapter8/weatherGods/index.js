const Alexa = require('alexa-sdk');
const axios = require('axios');
const moment = require('moment');
let jokes = [
    `Where do snowmen keep their money? <break time="3s"> In a <emphasis level="strong"> snow bank </emphasis>.`,
    `As we waited for a bus in the frosty weather, the woman next to me mentioned that she makes a lot of mistakes when texting in the cold. I nodded knowingly. <break time="1s"> It’s the early signs of <emphasis level="strong"> typothermia. </emphasis>`,
    `Don’t knock the weather. <break time="1s"> If it didn’t change once in a while, nine tenths of the people <emphasis> couldn’t start a conversation.</emphasis>`
];

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const googleURL = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=';
const queryString = '&inputtype=textquery&fields=formatted_address,name&key=';

let welcomeMessage = 'You may ask the weather gods about the weather in your city or for a weather forecast';

const handlers = {
    'LaunchRequest': function() {
        this.emit(':ask', welcomeMessage);
    },

    'searchIntent': async function() {
        const { slots } = this.event.request.intent;
        let { city, query } = slots;
        let cityValue = city.value;
        let queryValue = query.value;
        if (!cityValue) {
            let slotToElicit = 'city';
            let speechOutput = `What city are you looking in?`;
            return this.emit(':elicitSlot', slotToElicit, speechOutput);
        }
        if (!queryValue) {
            let slotToElicit = 'query';
            let speechOutput = `What are you looking for in ${cityValue}`;
            return this.emit(':elicitSlot', slotToElicit, speechOutput);
        }
        let completeURL = googleURL + [queryValue, 'in', cityValue].join('%20') + queryString + GOOGLE_API_KEY;
        let [err, res] = await to(axios.get(completeURL));
        if (err || !res || !res.data) {
            let apology = `unfortunately I couldn't find that for you`;
            return this.emit(':tell', apology);
        }
        console.log('res', res);
        let data = res.data;
        let info = `There's ${data.candidates.length} ${query.value}${data.candidates.length === 1 ? "" : 's'} in ${city.value}.
        ${data.candidates.map(candidate => `the ${candidate.name}`)}`;
        return this.emit(':tell', info);
    },

    'getWeather': async function() {
        console.log('this.event', this.event);
        const { slots } = this.event.request.intent;
        let { location, date } = slots;
        location = location.value || this.attributes.location || null;
        date = date.value || this.attributes.date || null;

        if (!location) {
            let slotToElicit = 'location';
            let speechOutput = 'Where do you want to know the weather for?';
            return this.emit(':elicitSlot', slotToElicit, speechOutput);
        }
        if (!date) {
            date = Date.now();
        }

        let isToday = moment(date).isSame(Date.now(), 'day');

        try {
            if (isToday) {
                console.log('isToday');
                let [e, response] = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${location},us&appid=${process.env.API_KEY}`);
                if (e) {
                    this.emit(':tell', `We couldn't get the weather for ${location} but you can try again later`)
                    return;
                }
                let { data: weatherResponse } = response;
                let { weather, main: { temp, humidity } } = weatherResponse;
                let weatherString = formatWeatherString(weather);
                let formattedTemp = tempC(temp);
                // let formattedTemp = tempF(temp);
                let speech = `The weather in ${location} has ${weatherString} with a temperature of ${formattedTemp} and a humidity of ${humidity} percent`;
                this.emit(':tell', speech);
            } else {
                let { data: forecastResponse } = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${location},us&appid=${process.env.API_KEY}`);
                let { list } = forecastResponse;

                this.attributes.location = location;
                this.attributes.date = date;

                // reduce the data we keep
                let usefulForecast = list.map(weatherPeriod => {
                    let { dt_txt, weather, main: { temp, humidity } } = weatherPeriod;
                    return { dt_txt, weather, temp, humidity }
                });
                // reduce to 9am and 6pm forecasts only
                let reducedForecast = usefulForecast.filter(weatherPeriod => {
                    let time = weatherPeriod.dt_txt.slice(-8);
                    return time === '09:00:00' || time === '18:00:00';
                });
                // reduce to the day the user asked about 
                let dayForecast = reducedForecast.filter(forecast => {
                    return moment(date).isSame(forecast.dt_txt, 'day');
                });

                let weatherString = dayForecast.map(forecast => formatWeatherString(forecast.weather));
                let formattedTemp = dayForecast.map(forecast => tempC(forecast.temp));
                let humidity = dayForecast.map(forecast => forecast.humidity);
                let speech = `The weather in ${location} ${date} will have ${weatherString[0]} with a temperature of ${formattedTemp[0]} and a humidity of ${humidity[0]} percent, whilst in the afternoon it will have ${weatherString[1]} with a temperature of ${formattedTemp[1]} and a humidity of ${humidity[1]} percent`;
                this.emit(':tell', speech);
            }
        } catch (err) {
            console.log('err', err);
            let speech = `My powers are weak and I couldn't get the weather right now.`;
            this.emit(':tell', speech);
        }

    },

    'tellAJoke': function() {
        let randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        this.emit(':tell', randomJoke);
    }
};

const to = prom => prom.then(res => [null, res]).catch(err => [err, null]);

const tempC = temp => Math.floor(temp - 273.15) + ' degrees Celsius ';

const tempF = temp => Math.floor(9 / 5 * (temp - 273) + 32) + ' Fahrenheit';

const formatWeatherString = weather => {
    if (weather.length === 1) return weather[0].description;
    return weather.slice(0, -1).map(item => item.description).join(', ') + ' and ' + weather.slice(-1)[0].description;
};

exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.appId = 'amzn1.ask.skill.c00e1979-7720-4843-9098-3dda9c63618d';
    alexa.registerHandlers(handlers);
    alexa.execute();
};