var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var d3 = require('d3');
require('dotenv').config();

var $ = require('jquery');

// view engine setup
var handlebars = require('express-handlebars')
    .create({ defaultLayout: 'main' });
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.get('/', function (req, res) {
    console.log('logs work');
    res.render('index');
});

var chartData = [];

//Whenever someone connects this gets executed
io.on('connection', function (socket) {
    console.log('A user connected');
    
    socket.on('clientLoad', function (data) {
        io.sockets.emit('broadcast', { 'chartData': JSON.stringify(chartData) });
    });

    socket.on('removeStock', function (data) {
        console.log('removeStock fires()');

        for (var i = 0; i < chartData.length; i++) {
            if (chartData[i].symbol == data) {
                chartData.splice(i, 1);
            }
        }
        

        io.sockets.emit('broadcast', { 'chartData': JSON.stringify(chartData) });
    });

    socket.on('chartData', function (data) {

        if (!stockExists(data)) {
            var url = "https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=" + data + "&apikey=" + process.env.API_KEY;
            console.log(url);
            d3.json(url, function (d) {

                var parsedData = {};
                parsedData.symbol = d["Meta Data"]["2. Symbol"];
                parsedData.chart = [];

                for (var property in d["Monthly Time Series"]) {

                    var obj = {};
                    obj.date = new Date(property);
                    obj.close = d["Monthly Time Series"][property]["4. close"];
                    parsedData.chart.push(obj);
                }
                chartData.push(parsedData);
                io.sockets.emit('broadcast', { 'chartData': JSON.stringify(chartData) });

            });
            
            //chartData.push(data);
            //io.sockets.emit('broadcast', { 'chartData': JSON.stringify(chartData) });
        }
        
        
    });

});

function stockExists(stock) {

    for (var i = 0; i < chartData.length; i++) {
        if (chartData[i].symbol == stock) {
            return true;
        }            
    }
    return false;
}



http.listen(process.env.PORT || 3000);