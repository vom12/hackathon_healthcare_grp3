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
bot.dialog('/', [
    function (session, args) {
        var intent = args.intent;
        var title = builder.EntityRecognizer.findEntity(intent.entities, 'AppointmentType');
        session.sendTyping(); //...typing
        //builder.Prompts.text(session, "Greetings! Please choose your appointment type.");
        builder.Prompts.choice(session, "Greetings! Please choose your appointment type.", ["Cardio"], { listStyle: builder.ListStyle.button })
    },
    function (session, results) {
        session.userData.appointmentType = results.response.entity;
        console.log(JSON.stringify(session.userData,null,2))
        builder.Prompts.time(session, "Please enter desired date.");

        //builder.Prompts.number(session, "Hi " + results.response.entity + ", How many years have you been coding?"); 
    },
    function (session, results, next) {
       
        session.userData.desiredDate = results.response.entity;
        console.log(session.userData.desiredDate)
        session.sendTyping(); //...typing

        ugbroka.addReferrer('203180', session.userData.appointmentType , randomReference(), session.userData.desiredDate ).then( (referrer) => {
            //console.log(referrer);
            //console.log('Calling slots')
            return ugbroka.findFreeSlots(referrer.order.Application, referrer.order.Number);
        })
        .then( slots => { 
            //console.log(slots.FindFreeSlotsResult.Steps.Step[0].Programs);
            return slots.FindFreeSlotsResult.Steps.Step[0].Programs.Program
        })
        .then( resources => { 
            session.userData.doctors = []
            resources.forEach(function(item){

                session.userData.doctors[item.Resource.Name + " of " + item.Site.Name] = item;

            });
           
        }).then(function(){
            console.log(session.userData.doctors);
            next();
        })
        .catch( function(err){
            console.log(err);
        });
        

        
    },function(session,results) {

        builder.Prompts.choice(session, "Please choose desired hospital and doctor.", session.userData.doctors, { listStyle: builder.ListStyle.button });

    },function (session, results) {
        session.userData.hospDoc = results.response.entity;
        var timeslot = [];
        
        session.userData.doctors[results.response.entity].Slots.Slot.forEach(function(slot){
            timeslot[new Date(slot.StartTime).toLocaleString() + " to " + new Date(slot.EndTime).toLocaleTimeString() ] = slot;
        })
        
       
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




//returns ranndom ABC123
let randomReference = function() {

    var randomRef = Math.random().toString(35).replace(/[^a-z]/g,'').substring(0,3).replace(/.*/g, function(v){return v.toUpperCase()})
    
    randomRef = randomRef + (Math.floor(Math.random()*900) + 100);

    return randomRef;
}


