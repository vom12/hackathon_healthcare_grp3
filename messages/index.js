/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
https://aka.ms/abs-node-luis
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
var ugbroka = require('./ugbrokaapi/soapcalls');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
//var dialog = new builder.LuisDialog(LuisModelUrl);

ugbroka.addReferrer('203177', 'CARDIO', 'AAJ123', session.userData.desiredDate, function (res) {
            console.log(res)
        });

bot.recognizer(new builder.LuisRecognizer(LuisModelUrl));
//bot.dialog('/', dialog);
bot.dialog('/', [
    function (session, args) {
        var intent = args.intent;
        var title = builder.EntityRecognizer.findEntity(intent.entities, 'AppointmentType');
        session.send("Appointment...");
        //builder.Prompts.text(session, "Greetings! Please choose your appointment type.");
        builder.Prompts.choice(session, "Greetings! Please choose your appointment type.", ["Cardio"], { listStyle: builder.ListStyle.button })
    },
    function (session, results) {
        session.userData.appointmentType = results.response.entity;
        console.log(JSON.stringify(session.userData,null,2))
        builder.Prompts.time(session, "Please enter desired date.");

        //builder.Prompts.number(session, "Hi " + results.response.entity + ", How many years have you been coding?"); 
    },
    function (session, results) {
        session.userData.desiredDate = results.response.entity;
        console.log(session.userData.desiredDate)
        session.send("Sending Referal...");
        

        builder.Prompts.choice(session, "Please choose desired hospital and doctor.", ["Site A - Dr. Dickson Martin", "Site A - Dr. Erwing Sandra", "Site B - Dr. Schwarz Marc"], { listStyle: builder.ListStyle.button });
    },

    function (session, results) {
        session.userData.hospDoc = results.response.entity;
        var timeslot = [];

        if (results.response.entity) {
            switch (results.response.entity) {
                case "Site A - Dr. Dickson Martin":
                    timeslot = ["8:00-8:30", "8:30-9:00", "9:00-9:30"];
                    break;
                case "Site A - Dr. Erwing Sandra":
                    timeslot = ["8:00-8:30", "8:30-9:00", "9:00-9:30"];
                    break;
                case "Site B - Dr. Schwarz Marc":
                    timeslot = ["8:00-8:30", "8:30-9:00", "9:00-9:30"];
                    break;
            }
        }
        builder.Prompts.choice(session, "Please choose desired timeslot", timeslot, { listStyle: builder.ListStyle.button });
        //builder.Prompts.number(session, "Hi " + results.response.entity + ", How many years have you been coding?"); 
    },
    function (session, results) {
        session.userData.timeslot = results.response.entity;

        session.endDialog("Appointment Details: \n Appointment Type: " + session.userData.appointmentType + "\n Hospital and Doctor: " + session.userData.hospDoc + "\n Date: " + session.userData.desiredDate + " - " + session.userData.timeslot);
    }
]).triggerAction({ matches: 'ScheduleAppointment' });

//dialog.on('ScheduleAppointment', [
//    (session) => {
//        builder.Prompts.texts(session, "testing");
//    }
//    ]);
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/

intents.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

//bot.dialog('/', intents);    

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function () {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    var listener = connector.listen();
    var withLogging = function (context, req) {
        console.log = context.log;
        listener(context, req);
    }

    module.exports = { default: withLogging }
}