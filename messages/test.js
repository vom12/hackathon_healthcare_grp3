"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var azure = require('azure-storage');
 
var http = require('http');
 
var data = "";
 
var options = {
    host: 'marky.co',
    port: '80',
    path: thepath,
    method: 'POST',
    headers: {
        'secret': theSercretKeyWhichStopsBots,
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
    }
};
 
var dotenv = require('dotenv').config();
 
var useEmulator = (process.env.NODE_ENV == 'development');
 
var connector = useEmulator ? new builder.ChatConnector({
        appId: process.env['MicrosoftAppId'],
        appPassword: process.env['MicrosoftAppPassword']
    }) : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});
 
var bot = new builder.UniversalBot(connector);
 
var intents = new builder.IntentDialog();
bot.dialog('/', intents);
 
intents.matches(/-sh /i, function (session, args) {
    var input = args.matched.input
     
    //input will be in the format "-sh http://www.xomino.com"
    //better validation would probably be appropriate at some point
 
    //split the input into "-sh" and theURL
    data="url="+input.split(" ")[1]; 
    //match the POST length to the incoming URL
    options.headers['Content-Length'] = data.length 
    session.sendTyping(); //...typing
 
    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            session.send('Your short URL is: '+JSON.parse(chunk).shortUrl);
        });
    });
 
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });
 
// write data to request body
    req.write(data);
    req.end();
});
 
intents.onDefault(function (session, args, next) {
    session.send("I'm sorry "+session.dialogData.name+". I didn't understand.");
});
 
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