// what i want to do?
// ===== connect SQL database to a bot
// tables:
// chat_settings(chat_id, current_location, is_subscribed, notification_period, next_notification_time), 
// requests(id, location, timestamp, success)
// ===== bot functions
// start [void]
// help [void]
// forecast [int days]
// subscribe [void]
// unsubscribe [void]
// setCurrentLocation [string]
// setResponseLanguage [string]
// setNotificationPeriod [int hours (converted to minutes)]

import { Telegraf } from 'telegraf'
import * as weather from './weather.js';
import { CustomDate, formatDateISO8601, timeToMinutes } from './custom_date.js';
import * as mysql from 'mysql2';
import { schedule } from 'node-cron';
import { linearInterpolation } from './simple_math.js';

export const Bot = new Telegraf(process.env.WEATHER_REPORT_API_TOKEN)

const ConnectionMySQL = mysql.createConnection({
    host: 'localhost',
    user    : 'root',
    password: process.env.MYSQL_PWD,
    database: 'weather_report_db'
});

ConnectionMySQL.connect((err) => {
    if (err) {
      console.error('Error connecting to the database: ' + err.stack);
      return;
    }
    console.log('Connected to the database');
  });


// ===== Definition of telebot (Weather Report) commands
const botTest = async (ctx) => {
    const chat_id = ctx.message.chat.id;
    const sql_query = `SELECT * FROM chat_settings WHERE chat_id = ${chat_id};`;
}

const botStart = async (ctx) => {
    const chat_id = ctx.message.chat.id;
    const chat_title = ctx.message.chat.title;
    const sql_query = `INSERT INTO chat_settings (chat_id, chat_title, current_location, is_subscribed, is_banned)
    VALUES (${chat_id}, '${chat_title}', NULL, FALSE, FALSE);
    `;
    ConnectionMySQL.query(sql_query, (error, results, fields) => {
        console.log(results, fields);
        if (error) {
            console.log(error);
        }
    });
    await ctx.telegram.sendMessage(ctx.message.chat.id, `Чат зареєстровано`);
};

const botHelp = async (ctx) => {
    console.log(ctx.message.text, ctx.message)
    const message = `
    Вітаю, ${ctx.state.role}!
    Цей бот розробляється для надання прогнозу погоди.
    /start - запуск бота
    /help - допомога (опис команд функцій/команд)
    /settings - переглянути налаштування групи
    /forecast [населенний пункт] [днів після сьогодні]
    /subscribe - сповіщати періодично
    /unsubscribe - не сповіщати
    /set_location [населенний пункт] - встановити поточну локацію групи
    `;
    await ctx.telegram.sendMessage(ctx.message.chat.id, message);
};

const botSettings = async (ctx) => {
    const chat_id = ctx.message.chat.id;
    const chat_title = ctx.message.chat.title;
    const sql_query = `SELECT * FROM chat_settings WHERE chat_id = ${chat_id};`;
    ConnectionMySQL.query(sql_query, (error, results, fields) => {
        console.log(results);
        if (error) {
            console.log(error);
        }
        if (results.fieldCount == 0) {
            ctx.telegram.sendMessage(chat_id, "Зареєструйтесь: /start. Для списку можливих команд /help");
        }
        try {
            const msg = `
            Налаштування групи **${chat_title}**
            Поточна локація: ${results[0].current_location}
            `
            ctx.telegram.sendMessage(chat_id, msg);
        } catch (arr) {
            ctx.telegram.sendMessage(chat_id, "Зареєструйтесь: /start. Для списку можливих команд /help");
        }
    });
}

const botForecast = async (ctx) => {
    const message = ctx.message.text; // acquire full message of the command
    //console.log(message);
    try {
        const tokens = message.split(/\s+/);
        //const cmdToken = tokens[0];
        const firstToken = tokens[1];
        const secondToken = tokens[2];
        
        if (tokens.length > 3) {
            throw new Error("Invalid command format.");
        }
        
        const forecastLocation = firstToken;
        const forecastDay = isNaN(secondToken) ? 0 : parseInt(secondToken);  
        const forecastDate = (new CustomDate)
            .AddDays(forecastDay)
            .asString();
        
        console.log(forecastLocation, forecastDay, forecastDate);
        weather.fetchWeatherDataSinoptikTelegram(forecastLocation, forecastDate)
            .then((parsedData) => {
                // Handle the parsed data here
                console.log(JSON.stringify(parsedData, null, 4));
                ctx.telegram.sendMessage(ctx.message.chat.id, weather.generateWeatherReport(parsedData, forecastDate));
            })
            .catch((error) => {
                console.error("Error:", error);
                const errorMessage = "Помилка: Населенний пункт не знайдено :("
                ctx.telegram.sendMessage(ctx.message.chat.id, errorMessage);
            });

    } catch (err) {
        // send error message about wrong input
        console.log(err);
        const errorMessage = "Помилка: Неправильний формат вводу.\nСпробуйте /forecast [населений пункт] [день прогнозу]"
        ctx.telegram.sendMessage(ctx.message.chat.id, errorMessage);
    } finally {
        // ...
    }
};

const botSubscribe = async (ctx) => {
    const chat_id = ctx.message.chat.id;
    const sql_query_select = `SELECT is_subscribed FROM chat_settings
    WHERE chat_id = ${chat_id}`;
    ConnectionMySQL.query(sql_query_select, (error, results, fields) => {
        console.log(results, fields);
        if (error) {
            console.log(error);
            ctx.telegram.sendMessage(chat_id, error);
        }
        const isSubscribed = results[0].is_subscribed;
        console.log(isSubscribed, chat_id, results);
        if (!isSubscribed) {
            updateIsSubscribed(chat_id, isSubscribed);
            ctx.telegram.sendMessage(chat_id, "Ви щойно підписалися на сповіщення.");
        } else {
            ctx.telegram.sendMessage(chat_id, "Ви вже підписані на сповіщення. Щоб відписатися скористуйтеся командою /unsubscribe");
        }
    });
};

const botUnsubscribe = async (ctx) => {
    const chat_id = ctx.message.chat.id;
    const sql_query_select = `SELECT is_subscribed FROM chat_settings
    WHERE chat_id = ${chat_id}`;
    ConnectionMySQL.query(sql_query_select, (error, results, fields) => {
        console.log(results, fields);
        if (error) {
            console.log(error);
            ctx.telegram.sendMessage(chat_id, error);
        }
        const isSubscribed = results[0].is_subscribed; // get subscription status
        console.log(isSubscribed, chat_id, results);
        if (isSubscribed) {
            updateIsSubscribed(chat_id, isSubscribed);
            ctx.telegram.sendMessage(chat_id, "Щойно відписалися від сповіщень");
        } else {
            ctx.telegram.sendMessage(chat_id, "Ви ще не підписані на сповіщення. Напишіть /subscribe для того щоб підписатися");
        }
    });
};

const botSetCurrentLocation = async (ctx) => {
    const chat_id = ctx.message.chat.id;
    const message = ctx.message.text; // acquire full message of the command

    try {
        const tokens = message.split(/\s+/);
        
        if (tokens.length > 2) {
            throw new Error("Invalid command format.");
        }
        
        const currentLocation = tokens[1].toLowerCase();
        console.log(currentLocation);
        updateCurrentLocation(ctx, currentLocation);

    } catch (err) {
        // send error message about wrong input
        console.log(err);
        const errorMessage = "Помилка: неправильний формат вводу. Спробуйте /set_location [населенний пункт]";
        await ctx.telegram.sendMessage(ctx.message.chat.id, errorMessage);
    } finally {
        // ...
    }
};

const botSubscriptionForecast = async(chat_id, currentLocation) => {
    // !!! call every hour for subscribed users

    // linear interpolation of the weather?
    // or polynomial splines ??

    // date-time strings
    const currentDate = new CustomDate().asString();
    const currentTime = new Date().getHours().toString() + ":" + new Date().getMinutes().toString();
    const currentDatetime = formatDateISO8601(currentDate, currentTime);
    console.log(currentDatetime);

    let message; // instantiate message to rewrite later

    // acquire weather data
    weather.fetchWeatherDataSinoptikTelegram(currentLocation, currentDate)
        .then((parsedData) => {
            // Handle the parsed data here
            const time = parsedData.time;
            const temp = parsedData.temperature.map((s) => extractNumber(s));
            //const tempSens = parsedData.temperatureSens.map((s) => extractNumber(s));
            const humid = parsedData.humidity.map((s) => extractNumber(s));
            const wind = parsedData.windSpeed.map((s) => extractNumber(s));
            const pres = parsedData.pressure.map((s) => extractNumber(s))
            const prec = parsedData.precipitation.map((s) => extractNumber(s));
            const now_minutes = timeToMinutes(currentTime);
            
            const index = time.map((t) => {
                return (timeToMinutes(t) >= now_minutes);
            }).indexOf(true);
            
            const [time_a, time_b] = [index-1, index % time.length]; // for linear interpolation
            const [t1, t2] = time
                .slice(time_a, time_b + 1)
                .map((t) => timeToMinutes(t));
            
            console.log(time_a, t1, time_b, t2);
            console.log(time[time_a], time[time_b], now_minutes);
            console.log(temp[time_a], temp[time_b]);
            
            const temperatureResult = linearInterpolation(t1, temp[time_a], t2, temp[time_b], now_minutes);
            //const temperatureSensResult = linearInterpolation(t1, tempSens[time_a], t2, tempSens[time_b], now_minutes);
            const humidityResult = linearInterpolation(t1, humid[time_a], t2, humid[time_b], now_minutes);
            const windSpeedResult = linearInterpolation(t1, wind[time_a], t2, wind[time_b], now_minutes);
            const precipitationResult = linearInterpolation(t1, prec[time_a], t2, prec[time_b], now_minutes);
            const pressureResult = linearInterpolation(t1, pres[time_a], t2, pres[time_b], now_minutes);
            const message = `
            Погода на зараз (${currentDatetime})
            Температура: ${temperatureResult}°C,
            Вологість: ${humidityResult}%,
            Ш-ть вітру: ${windSpeedResult} м/с,
            Тиск: ${pressureResult} мм рт.ст,
            Ймовірність опадів: ${precipitationResult}%
            `
            console.log(message);
            Bot.telegram.sendMessage(chat_id, message);
        })
        .catch((error) => {
            console.error("Error:", error);
            message = error;
            console.log(message);
        });
    console.log(message);
    return message;
}

const botNotifySubscribedChats = async () => {
    const sql_query = "SELECT chat_id, current_location FROM chat_settings WHERE is_subscribed = TRUE;"

    ConnectionMySQL.query(sql_query, (error, results, fields) => {
        console.log(results); // List[Dict]
        if (error) {
            console.log(error);
        }
        //const message = "!!! Important announcement !!!";
        
        results.forEach((rec) => {
            botSubscriptionForecast(rec.chat_id, rec.current_location)
                .catch((error) => {
                    console.log(error);
                });
        });
    });
}

Bot.command('test', botTest);
Bot.command('start', botStart);
Bot.command('help', botHelp);
Bot.command('settings', botSettings);
Bot.command('forecast', botForecast);
Bot.command('subscribe', botSubscribe);
Bot.command('unsubscribe', botUnsubscribe);
Bot.command('set_location', botSetCurrentLocation);
// schedule('* * * * *', botNotifySubscribedChats); // every minute scheduling
schedule('0 * * * *', botNotifySubscribedChats); // every hour scheduling


// ===== SQL Helper functions =======================================
// ...

const updateIsSubscribed = async (chat_id, isSubscribed) => {  // (bigint, bool) -> void
    const sql_query = `UPDATE chat_settings SET is_subscribed = ${!isSubscribed}
                        WHERE chat_id = ${chat_id};`;

    ConnectionMySQL.query(sql_query, (error, results, fields) => {
        //console.log(results, fields);
        if (error) {
            console.log(error);
        };
    });
}

const updateCurrentLocation = async (ctx, currentLocation) => { // (context, bigint, string) -> void
    const chat_id = ctx.message.chat.id;
    const date = new CustomDate().asString();
    const urlSinoptik = "https://ua.sinoptik.ua/погода-" + currentLocation + "/" + date;
    fetch(urlSinoptik)
        .then(response => {
            //console.log(chat_id, response.status, response);
            if (response.status == 200) {
                const sql_query = `UPDATE chat_settings SET current_location = '${currentLocation}'
                        WHERE chat_id = ${chat_id};`;
                
                ConnectionMySQL.query(sql_query, (error, results, fields) => {
                    console.log(results, fields);
                    if (error) {
                        console.log(error);
                    }
                });
            } else {
                ctx.telegram.sendMessage(chat_id, "Локацію не знайдено :(")
            }
        })
        .catch(err => {
            console.log(err);
        });
    return;
}

// ===== Other helper functions
const extractNumber = (str) => {
    const regex = /[-+]?\d+(\.\d+)?/;   // regex to match a real values including decimal points
    const match = str.match(regex);     // match first

    if (match) {
        const number = parseFloat(match[0]);
        return number;
    } else {
        return 0;
    }
};
