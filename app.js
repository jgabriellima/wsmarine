var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore');
var s = require("underscore.string");
var express = require('express');
var app = express();

/**/
var obj = {
    "belem": "http://www.marinetraffic.com/pt/ais/details/ports/2478/Brazil_port:BELEM",
    "viladoconde": "http://www.marinetraffic.com/pt/ais/details/ports/686/Brazil_port:VILA%20DO%20CONDE",
    "icoaraci": "http://www.marinetraffic.com/pt/ais/details/ports/19051/Brazil_port:ICOARACHI"
};
/**/
app.get('/', function(req, res) {
    /**/
    res.jsonp('wsmarine');
    /**/
});

app.get('/info', function(req, res) {
    /**/
    var url = '';
    /**/
    var porto = req.query.porto;
    if (porto !== undefined) {
        url = obj[removerAcentos(porto).toLowerCase()];
        if (url !== undefined) {
            run(url, function(result) {
                res.jsonp(result);
            });
        } else {
            res.jsonp("As informações para este porto não foram encontradas. Ex.: ?porto=belem");
        }
    } else {
        res.jsonp("O campo porto é obrigatório. Os portos disponíveis são: belem, vidadoconde, icoaraci. Ex.: ?porto=belem");
    }

});

app.listen(process.env.VCAP_APP_PORT || 3000);

function run(u, callback) {
    url = u;
    var jsonfinal = {};
    request(url, function(error, response, html) {
        if (!error) {
            var $ = cheerio.load(html);
            // console.log($(".bg-info").html());
            /*INFORMAÇOES DO PORTO*/
            // console.log("Porto: BELÉM");
            $(".bg-info").filter(function() {
                var data = $(this);
                //divs
                var porto = {};
                data.children().each(function(index, value) {
                    var data = $(value);
                    var key = s(data.find("span").text()).trim().value();
                    porto[key] = {
                        label: data.find("b").text(),
                        link: data.find("b").find("a").attr('href')
                    }
                });
                jsonfinal["porto"] = porto;
                // console.log(porto);
            });
            /*INFORMACOES DAS EMBARCAÇÕES - Chegadas e Partidas recentes*/
            // console.log("Chegadas e Partidas recentes");
            var chegadas = [];
            $("#tabs-arr-dep table tr").each(function(index, value) {
                var data = $(value);
                var td0 = $(data.children()[0]);
                var navio = td0.find("a").text();
                var link = td0.find("a").attr('href');
                var chegada = $(data.children()[1]).find("span").next().text();
                var partida = $(data.children()[2]).find("span").next().text();
                // console.log(navio, link, chegada, partida);
                if (navio !== "") {
                    chegadas.push({
                        "navio": navio,
                        "link": link,
                        "chegada": chegada,
                        "partida": partida
                    });
                }
            });
            jsonfinal["chegadas"] = chegadas;
            /*INFORMACOES DAS EMBARCAÇÕES - Navios no Porto*/
            var navios = [];
            // console.log("Navios no Porto");
            $("#tabs-cur-ves table tr td").each(function(index, value) {
                var data = $(value);
                var navio = data.find("a").text();
                var link = data.find("a").attr('href');
                // console.log(navio, link);
                navios.push({
                    "navio": navio,
                    "link": link
                });
            });
            jsonfinal["navios"] = navios;
            /**/
            var scripts = $("script");
            var script = scripts[scripts.length - 1].children[0].data;
            /**/
            var lines = s.lines(script);
            console.log();
            // ;
            _.each(lines, function(value, index) {
                if (s.startsWith(value, "window.app")) {
                    var app = value.replace("window.app = ", "").replace("};", "}");
                    // console.log(JSON.parse(app));
                    jsonfinal["maps"] = JSON.parse(app);
                }
            });

        }
        callback(jsonfinal);
        // console.log(jsonfinal);
    });
};

function removerAcentos(newStringComAcento) {
    var string = newStringComAcento;
    var mapaAcentosHex = {
        a: /[\xE0-\xE6]/g,
        e: /[\xE8-\xEB]/g,
        i: /[\xEC-\xEF]/g,
        o: /[\xF2-\xF6]/g,
        u: /[\xF9-\xFC]/g,
        c: /\xE7/g,
        n: /\xF1/g
    };

    for (var letra in mapaAcentosHex) {
        var expressaoRegular = mapaAcentosHex[letra];
        string = string.replace(expressaoRegular, letra);
    }

    return string;
};
