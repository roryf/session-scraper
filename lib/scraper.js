var request = require('request'),
    cheerio = require('cheerio'),
    Promise = require('promise'),
    _ = require('lodash'),
    fs = require('fs'),
    cookie = require('cookie');

var defaultOptions = {
    logger: console.log,
    logLevel: 'QUIET'
};

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

function getRandomUserAgent () {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function Scraper (options) {
    options = _.merge({}, defaultOptions, options);
    this.options = options;

    if ('userAgent' in options) {
        this.userAgent = options.userAgent;
    } else {
        this.userAgent = getRandomUserAgent();
    }
    this.log('Using User-Agent: ' + this.userAgent);

    this.cookies = {};

    if (options.output && !fs.existsSync(options.output)) {
        fs.mkdirSync(options.output);
    }
}

Scraper.prototype.get = function (url) {
    return this.performRequest({
        url: url,
        method: 'GET'
    });
};

Scraper.prototype.post = function (url, body) {
    return this.performRequest({
        url: url,
        method: 'POST',
        form: body
    });
};

Scraper.prototype.encoding = function (encoding) {
    this.encodingFn = encoding;
};

Scraper.prototype.performRequest = function (options) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var headers = {
            'User-Agent': self.userAgent,
            'cookie': _.map(self.cookies, function (val, key) {
                return cookie.serialize(key, val);
            }).join('; ')
        };

        options.headers = headers;

        self.log(options.method + ' ' + options.url, options.headers.cookie);

        request(options, function (err, response, body) {
            if (err) {
                self.log('Response error for ' + options.method + ' ' + options.url, err);
                reject(err);
                return;
            }

            self.saveSession(options.url, response);

            body = self.encodingFn ? self.encodingFn(body) : body;
            var $ = cheerio.load(body);
            $.body = body;
            $.response = response;
            if (!self.options.output) {
                resolve($);
            } else {
                var now = new Date().getTime();
                var content = {
                    request: {
                        url: options.url,
                        method: options.method,
                        headers: {
                            cookie: options.headers.cookie
                        }
                    },
                    response: {
                        status: response.statusCode,
                        headers: {
                            'Set-Cookie': response.headers['set-cookie']
                        },
                        body: new Buffer(body).toString('base64')
                    }
                };
                fs.writeFile(self.options.output + '/' + now + '.json', JSON.stringify(content), function (err) {
                    if (err) {
                        self.log('Error saving output', err);
                        reject(err);
                        return;
                    }

                    resolve($);
                });
            }
        });
    });
};

Scraper.prototype.saveSession = function (url, response) {
    var cookies = response.headers['set-cookie'];
    if (cookies) {
        cookies = cookie.parse(cookies);
        _.extend(this.cookies, cookies);
    }
};

Scraper.prototype.log = function () {
    if (this.options.logLevel === 'QUIET') {
        return;
    }

    this.options.logger.apply(null, arguments);
};

module.exports = Scraper;

var util = require('util');

Scraper.Cache = function () {
    var self = this;
    self.handler = null;

    self.cache = function (handler) {
        self.handler = handler;
    };

    self.forceGet = function (url) {
        return self.oldPerformRequest({
            url: url,
            method: 'GET'
        });
    };

    self.oldPerformRequest = self.performRequest;
    self.performRequest = function (opts) {

        return new Promise(function (resolve, reject) {
            var hasCache = opts.method === 'GET' && self.handler && self.handler.query && self.handler.persist,
                fn = function () {
                    self.oldPerformRequest(opts).then(function ($) {
                        try {
                            if (hasCache) {
                                self.handler.persist(opts.url, $.response, $.body);
                            }

                            resolve($);

                        } catch (err) {
                            reject(err);
                        }
                    });
                };

            if (hasCache) {
                self.handler.query(opts.url, function (response, body) {
                    if (response && body) {
                        var $ = cheerio.load(body);
                        $.body = body;
                        $.response = response;
                        resolve($);

                    } else {
                        fn();
                    }
                });
            } else {
                fn();
            }
        });
    };
};

util.inherits(Scraper.Cache, Scraper);
