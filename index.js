var cheerio = require('cheerio')
  , EventEmitter = require('events').EventEmitter
  , util = require('util')
  , https = require('https')
  , app = require('express')()
  , rss = require('rss')
  , pages = 2
  , routes = {
      avito: {
        url: 'https://www.avito.ma/fr/safi/informatique_et_multimedia-%C3%A0_vendre?o=',
        selectors: {items:'.item',price:'.price_value',desc:'h2.fs14',url:'h2.fs14 a'}},
      lbc: {
        url: 'https://www.leboncoin.fr/_multimedia_/offres/ile_de_france/?o=',
        selectors: {items:'.tabsContent li',desc:'.item_title',price:'.item_price',url:'a'}}
  };

app.listen(3000);
var Waitress = function (x) {
  EventEmitter.call(this);
  this.threshold = x;
  this.count = 0;
};
util.inherits(Waitress, EventEmitter);
Waitress.prototype.up = function () {
  if (++this.count === this.threshold)
    this.emit('done');
}

Object.keys(routes).forEach(function (route) {
  app.get('/' + route , function (req, res) {
    res.type('xml');
    var feed = new rss({
      title: route,
      feed_url: routes[route].url + '1',
      site_url: routes[route].url + '1',
    });
    var waitress = new Waitress(pages);
    waitress.once('done', function () { res.send(feed.xml()); });
    for (var i = 1; i <= pages; ++i) {
      https.get(routes[route].url + i, function (msg) {
        var html = '';
        msg.on('data', function (x) {html += x}).on('end', function () {
          var $ = cheerio.load(html)
            , sels = routes[route].selectors
            , item = sels.items + ' ';
          var items = $(sels.items).each(function (_, x) {
            console.log(x);
            feed.item({
              title: $(sels.desc, x).text(),
              description: $(sels.price, x).text(),
              url: $(sels.url, x).attr('href')
            });
          });
          waitress.up();
        })
      });
    }
  });
});

