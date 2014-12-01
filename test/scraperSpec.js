var chai = require('chai'),
  expect = chai.expect,
  sinon = require('sinon'),
  nock = require('nock'),
  fs = require('fs'),
  rimraf = require('rimraf'),
  Scraper = require('../lib/scraper');

chai.use(require('sinon-chai'));
chai.use(require('chai-fs'));

afterEach(function() {
  nock.cleanAll();
});

describe('Scraper', function() {
  var scraper;

  beforeEach(function() {
    scraper = new Scraper();
  });

  describe('#get()', function() {
    it('returns a valid url', function(done) {
      nock('http://www.example.com')
        .get('/foobar')
        .reply(200, '<html><body><h1>Hello, World!</h1></body></html>');

      scraper.get('http://www.example.com/foobar').then(function($) {
        expect($('h1').text()).to.equal('Hello, World!');
        expect($.body).to.equal('<html><body><h1>Hello, World!</h1></body></html>');
        expect($.response.statusCode).to.equal(200);
      }).done(done, done);
    });

    it('errors on invalid url', function(done) {
      scraper.get('http://localhost:65000').then(done, function() {
        done();
      });
    });

    it('uses headers from previous response', function(done) {
      nock('http://www.example.com')
        .get('/')
        .reply(200, 'Hello, World!', {
          'Set-Cookie': 'foo=bar;'
        });
      nock('http://www.example.com')
        .matchHeader('Cookie', 'foo=bar')
        .get('/foobar')
        .times(2)
        .reply(200, 'Hello, World!');

      scraper.get('http://www.example.com/').then(function() {
        return scraper.get('http://www.example.com/foobar');
      }).then(function() {
        return scraper.get('http://www.example.com/foobar');
      }).done(function() {
        done();
      }, done);
    });

    it('adds new headers', function(done) {
      nock('http://www.example.com')
        .get('/')
        .reply(200, 'Hello, World!', {
          'Set-Cookie': 'foo=bar;'
        });
      nock('http://www.example.com')
        .matchHeader('Cookie', 'foo=bar')
        .get('/foobar')
        .reply(200, 'Hello, World!', {
          'Set-Cookie': 'hello=world; foo=test'
        });
      nock('http://www.example.com')
        .matchHeader('Cookie', 'foo=test; hello=world')
        .get('/hello')
        .reply(200, 'Hello, World!');

      scraper.get('http://www.example.com/').then(function() {
        return scraper.get('http://www.example.com/foobar');
      }).then(function() {
        return scraper.get('http://www.example.com/hello');
      }).done(function() {
        done();
      }, done);
    })

    it('uses same user-agent for each request', function(done) {
      nock('http://www.example.com')
        .matchHeader('User-Agent', scraper.userAgent)
        .get('/foobar')
        .times(2)
        .reply(200, 'Ok');

      scraper.get('http://www.example.com/foobar').then(function() {
        return scraper.get('http://www.example.com/foobar');
      }).done(function() {
        done();
      }, done);
    });
  });

  describe('#post()', function() {
    it('uses provided form values', function(done) {
      nock('http://www.example.com')
        .post('/foobar', {
          foo: 'bar'
        })
        .reply(200, 'Hello, World!');

      scraper.post('http://www.example.com/foobar', { foo: 'bar' }).done(function() {
        done();
      }, done);
    });
  });
});

describe('Scraper(options)', function() {

  describe('userAgent', function() {
    it('uses random default if not provided', function(done) {
      nock('http://www.example.com')
        .matchHeader('User-Agent', /Mozilla\/.*/)
        .get('/')
        .reply(200, 'Ok');

      var scraper = new Scraper({});
      scraper.get('http://www.example.com').then(function() {
        done();
      });
    });

    it('uses provided user-agent string', function(done) {
      nock('http://www.example.com')
        .matchHeader('User-Agent', 'foobar-agent 1.0')
        .get('/')
        .reply(200, 'Ok');

      var scraper = new Scraper({
        userAgent: 'foobar-agent 1.0'
      });
      scraper.get('http://www.example.com').then(function() {
        done();
      });
    });
  });

  describe('logLevel', function() {
    var logger;

    beforeEach(function() {
      logger = sinon.spy();
    });

    it('logs nothing by default', function(done) {
      nock('http://www.example.com')
        .get('/')
        .reply(200, 'Ok');

      var scraper = new Scraper({
        logger: logger
      });

      scraper.get('http://www.example.com').then(function() {
        expect(logger).not.to.have.been.called;
      }).done(done, done);
    });

    it('logs lots when told to', function(done) {
      nock('http://www.example.com')
        .get('/')
        .reply(200, 'Ok');

      var scraper = new Scraper({
        logger: logger,
        logLevel: 'VERBOSE'
      });

      scraper.get('http://www.example.com').then(function() {
        expect(logger).to.have.been.called;
      }).done(done, done);
    });
  });

  describe('output', function() {
    var scraper;

    beforeEach(function() {
      rimraf.sync('.tmp');
      scraper = new Scraper({
        output: '.tmp'
      });
    });

    afterEach(function() {
      // rimraf.sync('.tmp');
    });

    it('writes responses to output directory', function(done) {
      nock('http://www.example.com')
        .get('/').reply(200, 'this is the root', {
          'Set-Cookie': 'foo=bar; sessionId=123'
        })
        .post('/results.php').reply(200, 'bunch of results')
        .get('/stuff/item.php?id=1').reply(200, 'this is item 1')
        .get('/stuff/item.php?id=2').reply(200, 'this is item 2')
        .get('/images/1.jpg').reply(200, '')
        .get('/images/2.jpg').reply(200, '');

      scraper.get('http://www.example.com').then(function() {
        return scraper.post('http://www.example.com/results.php');
      }).then(function() {
        return scraper.get('http://www.example.com/stuff/item.php?id=1');
      }).then(function() {
        return scraper.get('http://www.example.com/stuff/item.php?id=2');
      }).then(function() {
        return scraper.get('http://www.example.com/images/1.jpg');
      }).then(function() {
        return scraper.get('http://www.example.com/images/2.jpg');
      }).done(function() {
        expect('.tmp').to.be.a.directory().and.not.empty;
        done();
      }, done);
    });
  });

  describe('input', function() {
    var scraper;

    beforeEach(function() {
      scraper = new Scraper({
        input: 'test/fixtures'
      });
    });

    it('uses fixture data', function() {

    });
  });

});
