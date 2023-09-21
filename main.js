// libs
// const weather = require('./weather'); // No need for the '.js' extension
// const userInterface = require('./user_interface'); // No need for the '.js' extension

import { Bot } from './telebot.js';

//import { fetchWeatherDataSinoptik } from '../weather.js';
//import { fetchWeatherDataGoogle } from '../weather.js';

// program entry point
async function main() {
    Bot.launch();
}

main();
