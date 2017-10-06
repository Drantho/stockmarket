var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var d3 = require('d3');
require('dotenv').config();

var $ = require('jquery');

// View engine setup
var handlebars = require('express-handlebars')
    .create({ defaultLayout: 'main' });
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

// Default route
app.get('/', function (req, res) {
    res.render('index');
});

// Array to store stock symbols
var chartData = [];


io.on('connection', function (socket) {
    
    //Send chart data on initial load
    socket.on('clientLoad', function (data) {
        io.sockets.emit('broadcast', { 'chartData': JSON.stringify(chartData) });
    });

    //Remove stock from array on user request
    socket.on('removeStock', function (data) {

        for (var i = 0; i < chartData.length; i++) {
            if (chartData[i].symbol == data) {
                chartData.splice(i, 1);
            }
        }
        
        // Send new data to clients
        io.sockets.emit('broadcast', { 'chartData': JSON.stringify(chartData) });
    });

    socket.on('chartData', function (data) {

        if (!stockExists(data)) {
            var url = "https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=" + data + "&apikey=" + process.env.API_KEY;
            console.log(url);
            d3.json(url, function (d) {

                //Format data
                var parsedData = {};
                parsedData.symbol = d["Meta Data"]["2. Symbol"];
                parsedData.chart = [];

                for (var property in d["Monthly Time Series"]) {

                    var obj = {};
                    obj.date = new Date(property);
                    obj.close = d["Monthly Time Series"][property]["4. close"];
                    obj.close = Number(obj.close).toFixed(2);
                    parsedData.chart.push(obj);
                }
                chartData.push(parsedData);
                io.sockets.emit('broadcast', { 'chartData': JSON.stringify(chartData) });

            });
          
        }
      
    });

});

//Loop through array to avoid duplicate stocks
function stockExists(stock) {

    for (var i = 0; i < chartData.length; i++) {
        if (chartData[i].symbol == stock) {
            return true;
        }            
    }
    return false;
}

//Start server
http.listen(process.env.PORT || 3000);