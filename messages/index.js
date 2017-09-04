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
var ugbroka = require('./ugbrokaapi/testPromise');

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
bot.dialog('askPatientId', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your patientId?');
    },
    function (session, results) {
        session.userData.patientId = results.response.entity;
        session.endDialogWithResult(results);
    }
]);

bot.dialog('/', [
    function (session, args) {
      session.beginDialog('askPatientId');
    },
    function (session, results) {

        session.sendTyping(); //...typing
        //builder.Prompts.text(session, "Greetings! Please choose your appointment type.");

        let greetingCheck = new Date().getHours();
        let greetingString;

        if(greetingCheck === 12){
          session.userData.greetingMessage = "Good Noon! ";
        }else if(greetingCheck < 12){
        	session.userData.greetingMessage = "Good Morning! ";
        }else{
        	session.userData.greetingMessage = "Good Evening! ";
        }

        builder.Prompts.choice(session, session.userData.greetingMessage + " " + session.userData.patientId + " Please choose your appointment type.", ["Cardio"], { listStyle: builder.ListStyle.button })

    },
    function (session, results) {
        session.userData.appointmentType = results.response.entity;
        session.sendTyping(); //...typing

        //console.log(JSON.stringify(session.userData,null,2))
        builder.Prompts.time(session, session.userData.greetingMessage + "Please enter desired date. format yyyy-mm-dd");

        //builder.Prompts.number(session, "Hi " + results.response.entity + ", How many years have you been coding?");
    },
    function (session, results, next) {

        session.userData.desiredDate = results.response.entity;
        console.log(session.userData.desiredDate)
        session.sendTyping(); //...typing

        ugbroka.addReferrer('203195', session.userData.appointmentType, randomReference(), session.userData.desiredDate).then((referrer) => {
            //console.log(referrer);
            //console.log('Calling slots')
            session.userData.orderNumber = referrer.order.Number;
            return ugbroka.findFreeSlots(referrer.order.Application, referrer.order.Number);
        })
            .then(slots => {
                //console.log(slots.FindFreeSlotsResult.Steps.Step[0].Programs);
                return slots.FindFreeSlotsResult.Steps.Step[0].Programs.Program
            })
            .then(resources => {
                session.userData.doctors = {};
                resources.forEach(function (item) {
                    session.userData.doctors[item.Resource.Name + " of " + item.Site.Name] = item;
                });

            }).then(function () {
                console.log("calling next()")
                next();
            })
            .catch(function (err) {
                console.log(err);
            });



    }, function (session, results, next) {

        builder.Prompts.choice(session, session.userData.greetingMessage + "Please choose desired hospital and doctor.", session.userData.doctors, { listStyle: builder.ListStyle.button });

    }, function (session, results, next) {
        session.userData.hospDoc = results.response.entity;
        let timeslot = {};
        session.sendTyping(); //...typing
        let slots = session.userData.doctors[results.response.entity].Slots.Slot
        console.log("\nSlots : " + JSON.stringify(slots, null, 2))
        console.log(slots.length)
        slots.forEach(function (slot) {

            // console.log("Adding slot " + JSON.stringify(slot))
            console.log("Time in Adding slot " + new Date(slot.StartTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + " XX " +  new Date(slot.EndTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }));

            var label = new Date(slot.StartTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + " - "+ new Date(slot.EndTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
            console.log('\n adding ' + label);

            timeslot[label] = slot;

        });

        session.userData.timeslot = timeslot;
        next();

    }, function (session, results){

        builder.Prompts.choice(session, session.userData.greetingMessage + "Please choose desired time.", session.userData.timeslot, { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        let startAndEnd = results.response.entity;
        let slot = session.userData.timeslot[startAndEnd];

        let startTime = new Date(slot.StartTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second : 'numeric' , hour12: false });
        let endTime = new Date(slot.EndTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second : 'numeric', hour12: false });

        session.sendTyping(); //...typing
        ugbroka.scheduleReferral('HACK',session.userData.orderNumber, slot, session.userData.desiredDate).then(res => {
            console.log(res)
            session.endDialog(session.userData.greetingMessage + "Appointment Created: <br/>Appointment Type: "
            + session.userData.appointmentType + "<br/>Site and Doctor: " + session.userData.hospDoc + "<br/>Date Start Time: " + session.userData.desiredDate + 'T' + startTime +
          "<br/>Date End Time: " + session.userData.desiredDate + 'T' + endTime);
        })

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
    console.log('with emulator')
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function () {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    console.log('no emulator')
    var listener = connector.listen();
    var withLogging = function (context, req) {
        console.log = context.log;
        listener(context, req);
    }

    module.exports = { default: withLogging }
}




//returns ranndom ABC123
let randomReference = function () {

    var randomRef = Math.random().toString(35).replace(/[^a-z]/g, '').substring(0, 3).replace(/.*/g, function (v) { return v.toUpperCase() })

    randomRef = randomRef + (Math.floor(Math.random() * 900) + 100);

    return randomRef;
}
