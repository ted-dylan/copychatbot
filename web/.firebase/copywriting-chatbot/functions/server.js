const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrcopywritingchatbot = onRequest({"region":"asia-northeast3"}, (req, res) => server.then(it => it.handle(req, res)));
  