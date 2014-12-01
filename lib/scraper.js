var request = require('request'),
  cheerio = require('cheerio'),
  Promise = require('promise'),
  _ = require('lodash'),
  cookie = require('cookie');

var USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1667.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1664.3 Safari/537.36',
  'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.16 Safari/537.36',
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:25.0) Gecko/20100101 Firefox/25.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:25.0) Gecko/20100101 Firefox/25.0',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:24.0) Gecko/20100101 Firefox/24.0',
  'Mozilla/5.0 (Windows NT 6.0; WOW64; rv:24.0) Gecko/20100101 Firefox/24.0',
  'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
  'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/4.0; InfoPath.2; SV1; .NET CLR 2.0.50727; WOW64)',
  'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 7.1; Trident/5.0)',
  'Mozilla/4.0 (Compatible; Windows NT 5.1; MSIE 6.0) (compatible; MSIE 6.0; Windows NT 5.1; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.13+ (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function Scraper() {
  this.userAgent = getRandomUserAgent();
  this.cookies = {};
}

Scraper.prototype.get = function(url) {
  return this.performRequest({
    url: url,
    method: 'GET'
  });
};

Scraper.prototype.post = function(url, body) {
  return this.performRequest({
    url: url,
    method: 'POST',
    form: body
  });
};

Scraper.prototype.performRequest = function(options) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var headers = {
      'User-Agent': self.userAgent,
      'cookie': _.map(self.cookies, function(val, key) {
        return cookie.serialize(key, val);
      }).join('; ')
    };

    options.headers = headers;

    request(options, function (err, response, body) {
      if (err) {
        reject(err);
        return;
      }

      self.saveSession(options.url, response);

      var $ = cheerio.load(body);
      $.body = body;
      $.response = response;
      resolve($);
    });
  });
};

Scraper.prototype.saveSession = function(url, response) {
  var cookies = response.headers['set-cookie'];
  if (cookies) {
    cookies = cookie.parse(cookies);
    _.extend(this.cookies, cookies);
  }
};
};

module.exports = Scraper;
