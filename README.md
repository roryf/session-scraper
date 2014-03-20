# Session Scraper [![Build Status](https://secure.travis-ci.org/roryf/session-scraper.png)](http://travis-ci.org/roryf/session-scraper)

![npm info](https://nodei.co/npm/session-scraper.png?compact=true)

A super simple web scraper that mimicks a browsing session by saving cookies and refering URL from previous requests.

# Install

```sh
$ npm install session-scraper
```

# Usage

```js
var Scraper = require('session-scraper');

var scraper = new Scraper();
scraper.get('https://github.com/roryf?tab=repositories').then(function($) {
  var repoUrl = $('.repolist li:first-child h3 a').attr('href');
  var name = $('.repolist li:first-child h3 a').text();
  console.log('Fetching readme for ' + name);
  scraper.get('http://github.com' + repoUrl).then(function($) {
    console.log($('.entry-content').text());
  });
});
```
