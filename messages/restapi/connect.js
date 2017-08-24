var https = require('https');
var http = require('http');



var userinfo = {
    "server": "52.163.246.246",
    "port": "8088"
}

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


var isAuthenticated = function (callback) {


        console.log("check auth")

        var options = {
            host: config.server,
            port: config.port,
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


module.exports = {
   

}

