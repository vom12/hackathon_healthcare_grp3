var soap = require('soap');
var path = require('path');
var soapWSDL = path.join(__dirname, '../Services.xml');



console.log('Loading soapcalls.js' + soapWSDL)

var addReferrer = function (patientID, department, referralNumber, day, callback) {

    return new Promise( (resolve,reject) =>  {

        soap.createClient(soapWSDL, function (err, client) {
            if (err) {
                console.log(err)
            }


            args = {
                "tns:addReferralRequest": {
                    "s2:EnvironmentContext": {
                        "s2:DestinationEnvironmentCode": "ug",
                        "s2:SourceEnvironmentCode": "test",
                        "s2:SourceEnvironmentType": "External"
                    },
                    "s2:DepartmentIdentifier": {
                        "s2:Type": "Abbreviation",
                        "s2:Value": department
                    },
                    "s2:UserIdentifier": {
                        "s2:IdentifierName": "Login",
                        "s2:IdentifierValue": "SAJE"
                    },
                    "s2:AppointmentTypeIdentifier": {
                        "s2:Type": "Abbreviation",
                        "s2:Value": "newccon"
                    },
                    "s2:PatientIdentifier": {
                        "s2:IdentifierName": "MasterPatientIndex",
                        "s2:IdentifierValue": patientID
                    },
                    "s2:ReferrerIdentifier": {
                        "s2:Type": "Abbreviation",
                        "s2:Value": "BAFI"
                    },
                    "s2:Note": "Please see the patient ASAP, Added from BOT",
                    "s2:StartDate": '2017-08-25',
                    "s2:EndDate": day,
                    "s2:ReferralApplication": "HACK",
                    "s2:ReferralNumber": referralNumber
                }
            }

            client.Services.ServicesSoap.AddReferral(args, function (err, result, raw, soapHeader) {

                if (!err) {
                    appointment = result.AddReferralResult.Referrals.Appointment[0];
                    //console.log(appointment)

                    data = {
                        status: appointment.AppointmentStatus,
                        order: appointment.Order,
                        BookPeriod: appointment.BookPeriod,
                        Department: appointment.Department.Abbreviation
                    }

                    resolve(data);

                } else {
                    console.log('ERROR : \n\n' + JSON.stringify(err, null, 2));
                    console.log('RAW' + raw);
                    console.log('REQUEST' + client.lastRequest)
                    reject(err);
                }

            });
            //}, { proxy: "http://web-proxy.phil.hp.com:8088" });

        });//soap

    });// promise

}//(203180,'CARDIO','HACK016','2017-08-26');


var findFreeSlots = function (app, orderNumber) {

    return new Promise(resolve => {
        soap.createClient(soapWSDL, function (err, client) {
            if (err) {
                console.log(err)
            }

            args = {
                "findFreeSlotsRequest": {
                    "EnvironmentContext": {
                        "DestinationEnvironmentCode": "ug",
                        "SourceEnvironmentCode": "TEST",
                        "SourceEnvironmentType": "External"
                    },
                    "UserIdentifier": {
                        "IdentifierName": "Login",
                        "IdentifierValue": "SAJE"
                    },
                    "ReferralIdentifier": {
                        "IdentifierName": "Order",
                        "IdentifierValue": app + "|" + orderNumber
                    },
                    "IncludeMonday": "true",
                    "IncludeTuesday": "true",
                    "IncludeWednesday": "true",
                    "IncludeThursday": "true",
                    "IncludeFriday": "true",
                    "IncludeSaturday": "true",
                    "IncludeSunday": "true"
                }
            }


            client.Services.ServicesSoap.FindFreeSlots(args, function (err, result, raw, soapHeader) {

                if (!err) {
                    resolve(result);
                    //console.log(JSON.stringify(result, null, 2));
                } else {
                    //console.log("ERR : " + JSON.stringify(err));
                    console.log(client.lastRequest)

                }

            });



        });
    });


}

var scheduleReferral = function (app, orderNumber, slot, desiredDate) {




    return new Promise(resolve => {
        soap.createClient(soapWSDL, function (err, client) {
            if (err) {
                console.log(err)
            }

            arg = {
                "scheduleReferralRequest": {
                    "EnvironmentContext": {
                        "DestinationEnvironmentCode": "ug",
                        "SourceEnvironmentCode": "TEST",
                        "SourceEnvironmentType": "External"
                    },
                    "UserIdentifier": {
                        "IdentifierName": "Login",
                        "IdentifierValue": "SAJE"
                    },
                    "ReferralIdentifier": {
                        "IdentifierName": "Order",
                        "IdentifierValue": app+ "|" + orderNumber
                    },
                    "SlotIdentifiers": {
                        "SlotIdentifier": {
                            "InternalId": slot.Id,
                            "StartDateTime": slot.StartTime,
                            "EndDateTime": slot.EndTime,
                            "StepSequence": slot.StepSequence
                        }
                    },
                    "Note": "FROM CHAT BOT"
                }
            }


            client.Services.ServicesSoap.ScheduleReferral(arg, function (err, result, raw, soapHeader) {

                if (!err) {
                    resolve(result);
                    //console.log(JSON.stringify(result, null, 2));
                } else {
                    //console.log("ERR : " + JSON.stringify(err));
                    console.log(client.lastRequest)

                }

            });



        });
    });

}

module.exports = {
    findFreeSlots: findFreeSlots,
    addReferrer: addReferrer,
    scheduleReferral:scheduleReferral

}
