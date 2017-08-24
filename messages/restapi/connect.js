var https = require('https');
var http = require('http');



var config = {
    "server": "52.163.246.246",
    "port": "8088",
    "proxy": ""
}

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


var createOvservation = function (callback) {


    console.log("check auth")

    var options = {
        host: config.server,
       // port: config.port,
        path: "/qcbin/rest/is-authenticated",
        method: "GET",
        headers: { 'Content-Type': 'application/json', 'Cookie': userinfo.cookie }
    };

    http.request(options, function (res) {
        console.log(res.statusCode)


        res.setEncoding('utf8');
        var output = '';

        res.on('data', function (chunk) {
            output += chunk;
        });
        res.on('end', function () {
            if (res.statusCode != 200) {
                login(c);
            } else {

                console.log("USER IS AUTHENTICATED")

            }


        });
    }).end();



}



var createOvservation = function (observation) {

    observation = {
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "text": "VitalSigns"
            }
        ],
        "code": {
            "id": "BMI",
            "text": "BMI"
        },
        "subject": {
            "id": "203177",
            "reference": "Patient/203177"
        },
        "context": {
            "id": "100023100001",
            "reference": "Encounter/100023100001",
            "display": "encounter-id"
        },
        "effectiveDateTime": "2017-08-16T18:35:00+00:00",
        "performer": [
            {
                "id": "04",
                "reference": "Organization/04",
                "display": "facility-id"
            },
            {
                "id": "SRKPH",
                "reference": "Practitioner/SRKPH",
                "display": "practitioner-id"
            }
        ],
        "valueQuantity": {
            "id": "BMI",
            "value": 19,
            "code": "19"
        },
        "referenceRange": [
            {
                "low": {
                    "id": "NormalLow",
                    "value": 18,
                    "code": "18"
                },
                "high": {
                    "id": "NormalHigh",
                    "value": 24,
                    "code": "24"
                }
            }
        ]
    }



    var options = {
        host: config.server,
        port: config.port,
        path: "/Observation?_format=json",
        method: "POST",
        headers: { 'Content-Type': 'application/json' }
    };


    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        var output = '';
        res.on('data', function (chunk) {
            output += chunk;
        });
        res.on('end', function () {
            console.log("Output: " + output);
            // console.log("Req.fields:"+req.fields);
            // newDefect=JSON.parse(output);
        });
    });
    console.log("REQUESTING " + JSON.stringify(observation))
    req.write(JSON.stringify(observation));
    req.on('error', function (e) {
        console.log('the erro msg' + e);
    });


    req.end();


    //return newDefect;
}(null)


module.exports = {
createOvservation : createOvservation
}

