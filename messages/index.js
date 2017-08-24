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

bot.recognizer(new builder.LuisRecognizer(LuisModelUrl));
//bot.dialog('/', dialog);
bot.dialog('/', [
    function (session, args) {
        var intent = args.intent;
        var title = builder.EntityRecognizer.findEntity(intent.entities, 'AppointmentType');
        //builder.Prompts.text(session, "Greetings! Please choose your appointment type.");
        builder.Prompts.choice(session, "Greetings! Please choose your appointment type.", ["Cardio"], {listStyle: builder.ListStyle.button})
    },
    function (session, results) {
        session.userData.appointmentType = results.response.entity;
        session.send(session.userData.appointmentType);
        // session.send("Sending Referral");
        // session.sendTyping();
        builder.Prompts.text(session, "Please choose desired date.");
        //builder.Prompts.number(session, "Hi " + results.response.entity + ", How many years have you been coding?"); 
    },
    function (session, results) {
        session.userData.desiredDate = results.response.entity;
        
        session.send(session.userData.desiredDate + " - " + session.userData.appointmentType);
    }

    // function (session, results) {
    //     session.userData.name = results.response.entity;
    //     session.send("Sending Referral");
    //     session.sendTyping();
    //     builder.Prompts.choice(session, "Please choose desired hospital", ["Site A", "Site B"], {listStyle: builder.ListStyle.button});
    //     //builder.Prompts.number(session, "Hi " + results.response.entity + ", How many years have you been coding?"); 
    // },
    // function (session, results) {
    //     var dr = [];
    //     session.userData.coding = results.response.entity;
    //     switch(results.response.entity){
    //         case "Site A":
    //             dr = ["Dr. A", "Dr. B", "Dr. C"];
    //             break;
    //         case "Site B":
    //             dr = ["Dr. D", "Dr. E", "Dr. F"];
    //             break;
    //     }
        
    //     builder.Prompts.choice(session, "Select your doctor.", dr, {listStyle: builder.ListStyle.button});
    //     //session.send(session.userData.coding)
    //     //session.userData.coding = results.response;
    //     //builder.Prompts.choice(session, "What language do you code Node using?", ["JavaScript", "CoffeeScript", "TypeScript"], {listStyle: builder.ListStyle.button});
    // },
    //     function (session, results) {
    //     var schedule = [];
    //     session.userData.language = results.response.entity;
    //     switch(results.response.entity){
    //         case "Dr. E":
    //             schedule = ["Sched1", "Sched2", "Sched3"];
    //             break;
    //         case "Dr. F":
    //             schedule = ["Sched4", "Sched5", "Sched6"];
    //             break;
    //     }
        
    //     builder.Prompts.choice(session, "Available schedules for " + results.response.entity, schedule, {listStyle: builder.ListStyle.button});
    //     //session.send(session.userData.coding)
    //     //session.userData.coding = results.response;
    //     //builder.Prompts.choice(session, "What language do you code Node using?", ["JavaScript", "CoffeeScript", "TypeScript"], {listStyle: builder.ListStyle.button});
    // },
    // function (session, results) {
    //     session.userData.test = results.response.entity;
    //     session.send("Appointment Type - "
    //                 + session.userData.name + 
    //                 "On  " + session.userData.coding + 
    //                 " Doctor " + session.userData.language + "." +  "Schedule - " + results.response.entity);
    // }
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
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}

