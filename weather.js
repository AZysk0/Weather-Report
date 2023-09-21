import * as cheerio from 'cheerio';
import * as fs from 'fs';
import { CustomDate } from './custom_date.js';

// =====  Helper functions

export function CheerioFunctorHTML(html) {  // designed to make compositions of parsing logic
    this.value = cheerio.load(html);
};

CheerioFunctorHTML.prototype.map = function(logic) {
    const res = function() {
        return new CheerioFunctorHTML(this.value.html(logic));
    }.bind(this);
    return res();
};

const parsePageSinoptik = (html) => {
    const allTrTagText = (new CheerioFunctorHTML(html)).map("tbody").value.text();
    const data = allTrTagText
        .replace(/(\d)\s*:\s*(\d)/g, '$1:$2')
        .split(/\s+/)
        .filter((elem) => Boolean(elem))
        .map((elem) => elem == '-' ? '0' : elem);
    
    console.log(data);
    const timeRegex = /^\d+:\d+$/; // Regular expression for "hh:mm" format
    const nIntervals = data.filter((elem) => timeRegex.test(elem)).length;

    const dictionary = {
        time: data.slice(0, nIntervals),
        temperature: data.slice(nIntervals, 2 * nIntervals),
        temperatureSens: data.slice(2 * nIntervals, 3 * nIntervals),
        pressure: data.slice(3 * nIntervals, 4 * nIntervals),
        humidity: data.slice(4 * nIntervals, 5 * nIntervals),
        windSpeed: data.slice(5 * nIntervals, 6 * nIntervals),
        precipitation: data.slice(6 * nIntervals, 7 * nIntervals)
    };
    
    return structuredClone(dictionary);
}

const saveDictToJSON = (filePath, dict) => {
    fs.writeFile(filePath, JSON.stringify(dict, null, 4), (err) => {
        if (err) {
            console.error('Error writing JSON file:', err);
        } else {
            console.log('JSON file saved successfully:', filePath);
        }
    });
}

const formatTimeStamp = (timeStamp) => {
    const [hours, minutes, seconds] = timeStamp.split(":").slice(0, 3).map((str) => parseInt(str));
    return (hours < 10 ? '0' + String(hours) : String(hours)) + ":"
        + (minutes < 10 ? '0' + String(minutes) : String(minutes)) + ":"
        + (seconds < 10 ? '0' + String(seconds) : String(seconds))
}

// ===== Weather report
export function WeatherReportBlock(time, temperature, humidity, windSpeed, pressure, precipitation) {
    this.time = time;
    this.temperature = temperature;
    this.humidity = humidity;
    this.windSpeed = windSpeed;
    this.pressure = pressure;
    this.precipitation = precipitation;
}

WeatherReportBlock.prototype.asString = function() {
    const res = function() {
        return `
        Час: ${this.time}
        Температура: ${this.temperature}C
        Вологість: ${this.humidity}%
        Ш-ть вітру: ${this.windSpeed} м/с
        Тиск: ${this.pressure} мм рт.ст.
        Ймовірність опадів: ${this.precipitation}%
        `;
    }.bind(this); 
    return res();
}

export const generateWeatherReport = (data, report_date) => {
    const tStamp = new Date().getHours().toString() + ":" 
                 + new Date().getMinutes() + ":" 
                 + new Date().getSeconds();

    // process weather data
    const weatherReports = data.time.map((time) => {
        const index = data.time.indexOf(time);
        return new WeatherReportBlock(
            time,
            data.temperature[index],
            data.humidity[index],
            data.windSpeed[index],
            data.pressure[index],
            data.precipitation[index]
        );
    }); // -> Array

    const fullReport = `Зараз: ${formatTimeStamp(tStamp)} \nДата прогнозу погоди: ${report_date}` + weatherReports
        .map((block) => block.asString())
        .reduce((x, y) => "\n" + x + "\n" + y); // -> String
    
    console.log(fullReport);
    return fullReport;
}

// ===== Fetching weather data using web scraping =====
export const getWebpageSourceReponse = async (url) => {
    // await to ensure fetch resolves
    const response = await fetch(url);
    return response;
};


export const fetchWeatherDataSinoptik = (strLocation, strDate) => {
    const url = ("https://ua.sinoptik.ua/погода-" + strLocation + "/" + strDate)
        .toLowerCase();

    // Fetch the webpage source
    getWebpageSourceReponse(url)
        .then(async (response) => {
            // Extract the HTML content from the response
            const savePath = "app_data/weather_data_sinoptik.json";
            const html = await response.text();
            console.log(typeof(html));
            const data = parsePageSinoptik(html);
            saveDictToJSON(savePath, data);
        })
        .catch((error) => {
            console.error("Error:", error);
        });
};


export const fetchWeatherDataSinoptikTelegram = (strLocation, strDate) => {
    const url = ("https://ua.sinoptik.ua/погода-" + strLocation + "/" + strDate)
        .toLowerCase();

    // Fetch the webpage source
    return getWebpageSourceReponse(url)
        .then(async (response) => {
            // Extract the HTML content from the response
            const html = await response.text();
            //console.log(html);
            return parsePageSinoptik(html);
        })
        .catch((error) => {
            console.error("Error:", error);
        });
};

export const fetchWeatherDataGoogle = async (strLocation) => {
    return;
};
