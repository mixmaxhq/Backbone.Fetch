// Backbone.Fetch.js 0.2.2
// ---------------

//     (c) 2016 Adam Krebs
//     Backbone.Fetch may be freely distributed under the MIT license.
//     For all details and documentation:
//     https://github.com/akre54/Backbone.Fetch

(function() {
  'use strict';

  var defaults = function(obj, source) {
    for (var prop in source) {
      if (obj[prop] === undefined) obj[prop] = source[prop];
    }
    return obj;
  };

  var stringifyGETParams = function(url, data) {
    var query = '';
    for (var key in data) {
      if (data[key] == null) continue;
      query += '&'
        + encodeURIComponent(key) + '='
        + encodeURIComponent(data[key]);
    }
    if (query) url += (~url.indexOf('?') ? '&' : '?') + query.substring(1);
    return url;
  };

  var ajax = function(options) {
    if (options.type === 'GET' && typeof options.data === 'object') {
      options.url = stringifyGETParams(options.url, options.data);
      delete options.data;
    }

    defaults(options, {
      method: options.type,
      headers: defaults(options.headers || {}, {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }),
      body: options.data
    })

    var getData = function(response) {
      return options.dataType === 'json' ? response.json() : response.text();
    }

    return fetch(options.url, options)
      .then(function(response) {
        if (response.ok) return getData(response);

        var error = new Error(response.statusText);

        return getData(response).then(function(responseData) {
          error.response = response;
          error.responseData = responseData;
          if (options.error) options.error(error);
          throw error;
        });
      })
      .then(options.success);
  };

  if (typeof exports === 'object') {
    module.exports = ajax;
  } else {
    Backbone.ajax = ajax;
  }
})();
