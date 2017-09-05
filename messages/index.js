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
var dialog = new builder.LuisDialog(LuisModelUrl);


bot.recognizer(new builder.LuisRecognizer(LuisModelUrl));
//bot.dialog('/', dialog);

bot.dialog('askPatientId', [
    function (session, args, next) {
        if (!session.userData.patientId) {
            session = setupGreeting(session);
            session.send(session.userData.greetingMessage + " Please enter patient ID");
        } else {
            session.beginDialog('askForDept');
        }
    }]

);

bot.dialog('ChatInit', [
    function (session, args) {

        session.beginDialog('askPatientId');
    }
]).triggerAction({ matches: /hi|hello/i });


bot.dialog('recievePatientId', [


    function (session, args, next) {
        session.userData = {};

        if (!session.userData['patientId']) {
            session.userData.patientId = session.message.text;

        }
        session.beginDialog('askForDept');

    }]

).triggerAction({ matches: /^[0-9]{6,7}$/ });

bot.dialog('reset', [


    function (session, args, next) {
        if (!!session.userData['patientId']) {
            session.userData = { patientId: session.userData['patientId'] };
            session.endConversation("Ok Bye");

        }

        session.beginDialog('askPatientId');

    }]

).triggerAction({ matches: /reset/ });;

bot.dialog('newBooking', [
    function (session, results) {
        if (!!session.userData['patientId']) {
            session.userData = { patientId: session.userData['patientId'] };
            session.beginDialog('askForDept')
        } else {
            session.beginDialog('askPatientId')
        }
    }]
).triggerAction({ matches: /[book|schedule|new].*appointment/i });

bot.dialog('askForDept', [
    function (session, results, next) {

        if (!session.userData['appointmentType']) {

            session.sendTyping(); //...typing
            //builder.Prompts.text(session, "Greetings! Please choose your appointment type.");
            setupGreeting(session);

            builder.Prompts.choice(session, session.userData.greetingMessage + " Please choose your appointment type. (select number)", ["Cardio"], { listStyle: builder.ListStyle.list });
        } else {
            session.beginDialog('askForDate')
        }


    }, function (session, results) {
        session.userData.appointmentType = results.response.entity;
        session.beginDialog('askForDate')

    }]
);

bot.dialog('askForDate', [
    function (session, results) {
        if (!session.userData.desiredDate) {
            session.sendTyping(); //...typing
            builder.Prompts.time(session, session.userData.greetingMessage + " Please enter desired date. format yyyy-mm-dd");
        } else {
            session.beginDialog('askForDocAndSlots')
        }

    }, function (session, results) {
        session.userData.desiredDate = results.response.entity;
        session.beginDialog('askForDocAndSlots')
    }]
);



bot.dialog('askForDocAndSlots', [
    function (session, results, next) {

        // session.sendTyping(); //...typing

        ugbroka.addReferrer(session.userData.patientId, session.userData.appointmentType, randomReference(), session.userData.desiredDate).then((referrer) => {
            console.log(referrer);
            console.log('Calling slots')
            session.userData.orderNumber = referrer.order.Number;
            return ugbroka.findFreeSlots(referrer.order.Application, referrer.order.Number);
        }).then(slots => {
            //console.log(slots.FindFreeSlotsResult.Steps.Step[0].Programs);
            return slots.FindFreeSlotsResult.Steps.Step[0].Programs.Program
        }).then(resources => {
            session.userData.doctors = {};
            resources.forEach(function (item) {
                session.userData.doctors[item.Resource.Name + " of " + item.Site.Name] = item;
            });

        }).then(() => {

            next();
        }).catch(function (err) {
            console.log(err);
            session.send(err.message)
            if (err.message.search(/date|Program/) != -1) {
                session.userData.desiredDate = null;
                session.beginDialog("askForDate");
            }

        });



    }, function (session, results) {

        builder.Prompts.choice(session, session.userData.greetingMessage + "Please choose desired hospital and doctor.", session.userData.doctors, { listStyle: builder.ListStyle.list });

    }, function (session, results, next) {
        session.userData.hospDoc = results.response.entity;
        let timeslot = {};
        session.sendTyping(); //...typing
        let slots = session.userData.doctors[results.response.entity].Slots.Slot

        console.log(slots.length)
        slots.forEach(function (slot) {


            console.log("Time in Adding slot " + new Date(slot.StartTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + " XX " + new Date(slot.EndTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }));

            var label = new Date(slot.StartTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) + " - " + new Date(slot.EndTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
            console.log('\n adding ' + label);

            timeslot[label] = slot;

        });

        session.userData.timeslot = timeslot;
        next();

    }, function (session, results) {

        builder.Prompts.choice(session, session.userData.greetingMessage + "Please choose desired time.", session.userData.timeslot, { listStyle: builder.ListStyle.list });
    },
    function (session, results) {
        let startAndEnd = results.response.entity;
        let slot = session.userData.timeslot[startAndEnd];

        let startTime = new Date(slot.StartTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
        let endTime = new Date(slot.EndTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });

        session.sendTyping(); //...typing
        ugbroka.scheduleReferral('HACK', session.userData.orderNumber, slot, session.userData.desiredDate).then(res => {

            session.endConversation("ID: " + session.userData.patientId + "\n\r" + session.userData.greetingMessage + "Appointment Created: \n\rAppointment Type: "
                + session.userData.appointmentType + "\n\rSite and Doctor: " + session.userData.hospDoc + "\n\rDate Start Time: " + session.userData.desiredDate + ' ' + startTime +
                "\n\rDate End Time: " + session.userData.desiredDate + ' ' + endTime);

        }).catch(err => {
            session.send(err);
        })

    }

])


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

function setupGreeting(session) {
    let greetingCheck = new Date().getHours();

    if (greetingCheck === 12) {
        session.userData.greetingMessage = "Good Noon! ";
    } else if (greetingCheck < 12) {
        session.userData.greetingMessage = "Good Morning! ";
    } else {
        session.userData.greetingMessage = "Good Evening! ";
    }
    return session;
}