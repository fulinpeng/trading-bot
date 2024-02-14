{
    code: 'ERR_BAD_REQUEST',
    config: {
      transitional: {
        silentJSONParsing: true,
        forcedJSONParsing: true,
        clarifyTimeoutError: false
      },
      adapter: [ 'xhr', 'http' ],
      transformRequest: [ [Function: transformRequest] ],
      transformResponse: [ [Function: transformResponse] ],
      timeout: 0,
      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',
      maxContentLength: -1,
      maxBodyLength: -1,
      env: { FormData: [Function], Blob: [class Blob] },
      validateStatus: [Function: validateStatus],
      headers: Object [AxiosHeaders] {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'X-MBX-APIKEY': 'W9MjiCH5x52x5UBQVmrY4flVrWHUz8bouP2VJtPa66jCuPmP1SV3E7ucwkwSL4cr',
        'User-Agent': 'axios/1.6.5',
        'Accept-Encoding': 'gzip, compress, deflate, br'
      },
      httpsAgent: HttpsProxyAgent {
        _events: [Object: null prototype],
        _eventsCount: 2,
        _maxListeners: undefined,
        options: [Object],
        requests: [Object: null prototype] {},
        sockets: [Object: null prototype],
        freeSockets: [Object: null prototype] {},
        keepAliveMsecs: 1000,
        keepAlive: false,
        maxSockets: Infinity,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        maxTotalSockets: Infinity,
        totalSocketCount: 1,
        proxy: [URL],
        proxyHeaders: {},
        connectOpts: [Object],
        [Symbol(kCapture)]: false,
        [Symbol(AgentBaseInternalState)]: [Object]
      },
      method: 'get',
      url: 'https://fapi.binance.com/fapi/v2/positionRisk?symbol=IDUSDT&timestamp=1707294057784&recvWindow=6000&signature=054f94a6e6cdc5bc5d949fa3feb29eafdc417a529fdfeb01fed535ceb4f119c2',
      data: undefined
    },
    request: <ref *1> ClientRequest {
      _events: [Object: null prototype] {
        abort: [Function (anonymous)],
        aborted: [Function (anonymous)],
        connect: [Function (anonymous)],
        error: [Function (anonymous)],
        socket: [Function (anonymous)],
        timeout: [Function (anonymous)],
        finish: [Function: requestOnFinish]
      },
      _eventsCount: 7,
      _maxListeners: undefined,
      outputData: [],
      outputSize: 0,
      writable: true,
      destroyed: false,
      _last: true,
      chunkedEncoding: false,
      shouldKeepAlive: false,
      maxRequestsOnConnectionReached: false,
      _defaultKeepAlive: true,
      useChunkedEncodingByDefault: false,
      sendDate: false,
      _removedConnection: false,
      _removedContLen: false,
      _removedTE: false,
      strictContentLength: false,
      _contentLength: 0,
      _hasBody: true,
      _trailer: '',
      finished: true,
      _headerSent: true,
      _closed: false,
      socket: TLSSocket {
        _tlsOptions: [Object],
        _secureEstablished: true,
        _securePending: false,
        _newSessionPending: false,
        _controlReleased: true,
        secureConnecting: false,
        _SNICallback: null,
        servername: 'fapi.binance.com',
        alpnProtocol: false,
        authorized: true,
        authorizationError: null,
        encrypted: true,
        _events: [Object: null prototype],
        _eventsCount: 9,
        connecting: false,
        _hadError: false,
        _parent: [Socket],
        _host: null,
        _closeAfterHandlingError: false,
        _readableState: [ReadableState],
        _maxListeners: undefined,
        _writableState: [WritableState],
        allowHalfOpen: false,
        _sockname: null,
        _pendingData: null,
        _pendingEncoding: '',
        server: undefined,
        _server: null,
        ssl: [TLSWrap],
        _requestCert: true,
        _rejectUnauthorized: true,
        parser: null,
        _httpMessage: [Circular *1],
        [Symbol(res)]: [TLSWrap],
        [Symbol(verified)]: true,
        [Symbol(pendingSession)]: null,
        [Symbol(async_id_symbol)]: 62,
        [Symbol(kHandle)]: [TLSWrap],
        [Symbol(lastWriteQueueSize)]: 0,
        [Symbol(timeout)]: null,
        [Symbol(kBuffer)]: null,
        [Symbol(kBufferCb)]: null,
        [Symbol(kBufferGen)]: null,
        [Symbol(kCapture)]: false,
        [Symbol(kSetNoDelay)]: false,
        [Symbol(kSetKeepAlive)]: true,
        [Symbol(kSetKeepAliveInitialDelay)]: 60,
        [Symbol(kBytesRead)]: 0,
        [Symbol(kBytesWritten)]: 0,
        [Symbol(connect-options)]: [Object]
      },
      _header: 'GET /fapi/v2/positionRisk?symbol=IDUSDT&timestamp=1707294057784&recvWindow=6000&signature=054f94a6e6cdc5bc5d949fa3feb29eafdc417a529fdfeb01fed535ceb4f119c2 HTTP/1.1\r\n' +
        'Accept: application/json, text/plain, */*\r\n' +
        'Content-Type: application/json\r\n' +
        'X-MBX-APIKEY: W9MjiCH5x52x5UBQVmrY4flVrWHUz8bouP2VJtPa66jCuPmP1SV3E7ucwkwSL4cr\r\n' +
        'User-Agent: axios/1.6.5\r\n' +
        'Accept-Encoding: gzip, compress, deflate, br\r\n' +
        'Host: fapi.binance.com\r\n' +
        'Connection: close\r\n' +
        '\r\n',
      _keepAliveTimeout: 0,
      _onPendingData: [Function: nop],
      agent: HttpsProxyAgent {
        _events: [Object: null prototype],
        _eventsCount: 2,
        _maxListeners: undefined,
        options: [Object],
        requests: [Object: null prototype] {},
        sockets: [Object: null prototype],
        freeSockets: [Object: null prototype] {},
        keepAliveMsecs: 1000,
        keepAlive: false,
        maxSockets: Infinity,
        maxFreeSockets: 256,
        scheduling: 'lifo',
        maxTotalSockets: Infinity,
        totalSocketCount: 1,
        proxy: [URL],
        proxyHeaders: {},
        connectOpts: [Object],
        [Symbol(kCapture)]: false,
        [Symbol(AgentBaseInternalState)]: [Object]
      },
      socketPath: undefined,
      method: 'GET',
      maxHeaderSize: undefined,
      insecureHTTPParser: undefined,
      joinDuplicateHeaders: undefined,
      path: '/fapi/v2/positionRisk?symbol=IDUSDT&timestamp=1707294057784&recvWindow=6000&signature=054f94a6e6cdc5bc5d949fa3feb29eafdc417a529fdfeb01fed535ceb4f119c2',
      _ended: true,
      res: IncomingMessage {
        _readableState: [ReadableState],
        _events: [Object: null prototype],
        _eventsCount: 4,
        _maxListeners: undefined,
        socket: [TLSSocket],
        httpVersionMajor: 1,
        httpVersionMinor: 1,
        httpVersion: '1.1',
        complete: true,
        rawHeaders: [Array],
        rawTrailers: [],
        joinDuplicateHeaders: undefined,
        aborted: false,
        upgrade: false,
        url: '',
        method: null,
        statusCode: 401,
        statusMessage: 'Unauthorized',
        client: [TLSSocket],
        _consuming: false,
        _dumped: false,
        req: [Circular *1],
        responseUrl: 'https://fapi.binance.com/fapi/v2/positionRisk?symbol=IDUSDT&timestamp=1707294057784&recvWindow=6000&signature=054f94a6e6cdc5bc5d949fa3feb29eafdc417a529fdfeb01fed535ceb4f119c2',
        redirects: [],
        [Symbol(kCapture)]: false,
        [Symbol(kHeaders)]: [Object],
        [Symbol(kHeadersCount)]: 18,
        [Symbol(kTrailers)]: null,
        [Symbol(kTrailersCount)]: 0
      },
      aborted: false,
      timeoutCb: null,
      upgradeOrConnect: false,
      parser: null,
      maxHeadersCount: null,
      reusedSocket: false,
      host: 'fapi.binance.com',
      protocol: 'https:',
      _redirectable: Writable {
        _writableState: [WritableState],
        _events: [Object: null prototype],
        _eventsCount: 3,
        _maxListeners: undefined,
        _options: [Object],
        _ended: true,
        _ending: true,
        _redirectCount: 0,
        _redirects: [],
        _requestBodyLength: 0,
        _requestBodyBuffers: [],
        _onNativeResponse: [Function (anonymous)],
        _currentRequest: [Circular *1],
        _currentUrl: 'https://fapi.binance.com/fapi/v2/positionRisk?symbol=IDUSDT&timestamp=1707294057784&recvWindow=6000&signature=054f94a6e6cdc5bc5d949fa3feb29eafdc417a529fdfeb01fed535ceb4f119c2',
        [Symbol(kCapture)]: false
      },
      [Symbol(kCapture)]: false,
      [Symbol(kBytesWritten)]: 0,
      [Symbol(kEndCalled)]: true,
      [Symbol(kNeedDrain)]: false,
      [Symbol(corked)]: 0,
      [Symbol(kOutHeaders)]: [Object: null prototype] {
        accept: [Array],
        'content-type': [Array],
        'x-mbx-apikey': [Array],
        'user-agent': [Array],
        'accept-encoding': [Array],
        host: [Array]
      },
      [Symbol(errored)]: null,
      [Symbol(kUniqueHeaders)]: null
    },
    response: {
      data: {
        code: -2015,
        msg: 'Invalid API-key, IP, or permissions for action, request ip: 45.143.235.178'
      }
    }
  }