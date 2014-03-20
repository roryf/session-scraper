var expect = require('chai').expect,
  nock = require('nock'),
  Scraper = require('../lib/scraper');

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
        .get('/foobar')
        .reply(200, 'Hello, World!', {
          'Set-Cookie': 'foo=bar;'
        });
      nock('http://www.example.com')
        .matchHeader('Cookie', 'foo=bar;')
        .matchHeader('Referer', 'http://www.example.com/foobar')
        .get('/foobar')
        .reply(200, 'Hello, World!');

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
})