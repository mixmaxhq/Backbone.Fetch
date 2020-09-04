import './support/add-xhr';

import sinon from 'sinon';
import { expect } from 'chai';

require('whatwg-fetch');
global.fetch = sinon.spy(global.fetch);

import ajax from '../backbone.fetch';

describe('backbone.fetch', () => {
  let server;

  beforeEach(() => {
    server = sinon.fakeServer.create();
  });

  afterEach(() => {
    server.restore();
  });

  describe('creating a request', () => {
    it('should pass the method and url to fetch', () => {
      ajax({
        url: 'http://test',
        type: 'GET',
      });

      sinon.assert.calledWith(fetch, 'http://test', sinon.match.has('method', 'GET'));
      sinon.assert.calledWith(fetch, 'http://test', sinon.match.has('body', undefined));
    });

    it('should stringify GET data when present', () => {
      ajax({
        url: 'http://test',
        type: 'GET',
        data: { a: 1, b: 2 },
      });
      sinon.assert.calledWith(fetch, 'http://test/?a=1&b=2');
    });

    it('should append to the querystring when one already present', () => {
      ajax({
        url: 'http://test/?foo=bar',
        type: 'GET',
        data: { a: 1, b: 2 },
      });
      sinon.assert.calledWith(fetch, 'http://test/?foo=bar&a=1&b=2');
    });

    it('should send POSTdata when POSTing', () => {
      ajax({
        url: 'http://test',
        type: 'POST',
        data: JSON.stringify({ a: 1, b: 2 }),
      });

      sinon.assert.calledWith(fetch, 'http://test', sinon.match.has('method', 'POST'));
      sinon.assert.calledWith(fetch, 'http://test', sinon.match.has('body', '{"a":1,"b":2}'));
    });
  });

  describe('headers', () => {
    it('should set headers if none passed in', () => {
      ajax({ url: 'http://test', type: 'GET' });
      sinon.assert.calledWith(
        fetch,
        'http://test',
        sinon.match({
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should use headers if passed in', () => {
      ajax({
        url: 'http://test',
        type: 'GET',
        headers: {
          'X-MyApp-Header': 'present',
        },
      });

      sinon.assert.calledWith(
        fetch,
        'http://test',
        sinon.match({
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-MyApp-Header': 'present',
          },
        })
      );
    });

    it('allows Accept and Content-Type headers to be overwritten', () => {
      ajax({
        url: 'http://test',
        type: 'GET',
        headers: {
          Accept: 'custom',
          'Content-Type': 'custom',
          'X-MyApp-Header': 'present',
        },
      });

      sinon.assert.calledWith(
        fetch,
        'http://test',
        sinon.match({
          headers: {
            Accept: 'custom',
            'Content-Type': 'custom',
            'X-MyApp-Header': 'present',
          },
        })
      );
    });
  });

  describe('finishing a request', () => {
    it('should invoke the success callback on complete', () => {
      const promise = ajax({
        url: 'http://test',
        type: 'GET',
        success(response) {
          expect(response).to.equal('ok');
        },
      });
      server.respond('ok');
      return promise;
    });

    it('should parse response as json if dataType option is provided', () => {
      const promise = ajax({
        url: 'http://test',
        dataType: 'json',
        type: 'GET',
        success(response) {
          expect(response).to.deep.equal({ status: 'ok' });
        },
      }).then((response) => {
        expect(response).to.deep.equal({ status: 'ok' });
      });
      server.respond('{"status": "ok"}');
      return promise;
    });

    it('should invoke the error callback on error', async () => {
      const promise = ajax({
        url: 'http://test',
        type: 'GET',
        success(response) {
          throw new Error('this request should fail');
        },
        error(error) {
          expect(error.response.status).to.equal(400);
        },
      });

      setTimeout(() => server.respond([400, {}, 'Server error']), 1);
      return promise
        .then(() => {
          throw new Error('this request should fail');
        })
        .catch((error) => {
          expect(error.response.status).to.equal(400);
        });
    });

    it('should not fail without error callback', async () => {
      const promise = ajax({
        url: 'http://test',
        type: 'GET',
        success(response) {
          throw new Error('this request should fail');
        },
      });

      setTimeout(() => server.respond([400, {}, 'Server error']), 1);
      return promise
        .then(() => {
          throw new Error('this request should fail');
        })
        .catch((error) => {
          expect(error.response.status).to.equal(400);
        });
    });

    it('should produce an error for invalid json', async () => {
      const promise = ajax({
        dataType: 'json',
        url: 'http://test',
        type: 'GET',
      });

      setTimeout(() => server.respond([200, {}, '']), 1);
      return promise
        .then(() => {
          throw new Error('this request should fail');
        })
        .catch((error) => {
          expect(error).to.be.an.instanceof(SyntaxError);
          expect(error).not.to.have.property('response');
        });
    });

    it('should not parse json for 204 responses', async () => {
      const promise = ajax({
        dataType: 'json',
        url: 'http://test',
        type: 'GET',
      });

      setTimeout(() => server.respond([204, {}, '']), 1);
      return promise;
    });

    it('should parse json as property of Error on failing request', async () => {
      const promise = ajax({
        dataType: 'json',
        url: 'http://test',
        type: 'GET',
      });

      setTimeout(() => server.respond([400, {}, JSON.stringify({ code: 'INVALID_HORSE' })]), 1);
      return promise
        .then(() => {
          throw new Error('this request should fail');
        })
        .catch((error) => {
          expect(error.responseData).to.deep.equal({ code: 'INVALID_HORSE' });
        });
    });

    it('should parse text as property of Error on failing request', async () => {
      const promise = ajax({
        dataType: 'text',
        url: 'http://test',
        type: 'GET',
      });

      setTimeout(() => server.respond([400, {}, 'Nope']), 1);
      return promise
        .then(() => {
          throw new Error('this request should fail');
        })
        .catch((error) => {
          expect(error.responseData).to.equal('Nope');
        });
    });
  });

  it('should pass through network errors', async () => {
    const promise = ajax({
      dataType: 'text',
      url: 'http://test',
      type: 'GET',
    });

    setTimeout(() => {
      debugger;
      server.respond([0, {}, 'Network error']);
    }, 1);
    return promise
      .then(() => {
        throw new Error('this request should fail');
      })
      .catch((error) => {
        expect(error).to.be.an.instanceof(TypeError);
        expect(error).not.to.have.property('response');
        expect(error.message).to.equal('Network request failed');
      });
  });

  describe('Promise', () => {
    it('should return a Promise', () => {
      const xhr = ajax({ url: 'http://test', type: 'GET' });
      expect(xhr).to.be.an.instanceof(Promise);
    });
  });
});
