// Backbone.Fetch.js 0.2.4
// ---------------

//     (c) 2016 Adam Krebs
//     Backbone.Fetch may be freely distributed under the MIT license.
//     For all details and documentation:
//     https://github.com/akre54/Backbone.Fetch

import defaults from 'lodash/defaults';
import has from 'lodash/has';

function stringifyGETParams(url, data) {
  const parsed = new URL(url);
  for (const key in data) {
    if (!has(data, key)) continue;
    const value = data[key];
    if (value == null) continue;
    parsed.searchParams.append(key, value);
  }
  return parsed.href;
}

function getData(response, dataType) {
  return dataType === 'json' && response.status !== 204 ? response.json() : response.text();
}

export default function ajax(options) {
  let url = options.url;
  if (options.type === 'GET' && options.data !== null && typeof options.data === 'object') {
    url = stringifyGETParams(url, options.data);
    delete options.data;
  } else {
    // For consistent errors when the url isn't valid.
    new URL(url);
  }

  defaults(options, {
    method: options.type,
    headers: defaults(options.headers || {}, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
    body: options.data,
  });

  return fetch(url, options)
    .then((response) => {
      const promise =
        options.type === 'HEAD' ? Promise.resolve(null) : getData(response, options.dataType);

      if (response.ok) return promise;

      const error = new Error(response.statusText);
      return promise.then((responseData) => {
        error.response = response;
        error.responseData = responseData;
        if (options.error) options.error(error);
        throw error;
      });
    })
    .then((responseData) => {
      if (options.success) options.success(responseData);
      return responseData;
    });
}
