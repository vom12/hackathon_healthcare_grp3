var soap = require('soap');
var soapWSDL = "./Services.xml";

var addReferrer = function (patientID, department, referralNumber, day, callback) {

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

                data = {
                    status: appointment.AppointmentStatus,
                    order: appointment.Order,
                    BookPeriod: appointment.BookPeriod,
                    Department: appointment.department
                }
                
                
                console.log(JSON.stringify(data));
                console.log("CALLING FIND FREE SLOTS")

                findFreeSlots(data.order.Application, data.order.Number, callback);

            } else {
                console.log('ERROR : \n\n' + JSON.stringify(err, null, 2));
                console.log('RAW' + raw);
                console.log('REQUEST' + client.lastRequest)
            }

        },{proxy: "http://web-proxy.phil.hp.com:8088"});



    });

}//(203180,'CARDIO','HACK016','2017-08-26');


var findFreeSlots = function (app, orderNumber, c) {

   
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
                c(result);
                console.log(JSON.stringify(result, null, 2));
            } else {
                //console.log("ERR : " + JSON.stringify(err));
                console.log(client.lastRequest)
              
            }


        });



    });
}

var scheduleReferral = function (app,orderNumber,slotId) {

    arg = {
        "ult:scheduleReferralRequest": {
            "ns:EnvironmentContext": {
                "ns:DestinationEnvironmentCode": "ug",
                "ns:SourceEnvironmentCode": "TEST",
                "ns:SourceEnvironmentType": "External"
            },
            "ns:UserIdentifier": {
                "ns:IdentifierName": "Login",
                "ns:IdentifierValue": "SAJE"
            },
            "ns:ReferralIdentifier": {
                "ns:IdentifierName": "Order",
                "ns:IdentifierValue": "HACK|HACK002"
            },
            "ns:SlotIdentifiers": {
                "ns:SlotIdentifier": {
                    "ns:InternalId": "3207537",
                    "ns:StartDateTime": "2017-08-25T11:20:00",
                    "ns:EndDateTime": "2017-08-25T12:00:00",
                    "ns:StepSequence": "1"
                }
            },
            "ns:Note": "FROM CHAT BOT"
        }
    }

}

module.exports = {
    findFreeSlots: findFreeSlots,
    addReferrer: addReferrer

}