const { AsyncLocalStorage } = require('async_hooks');

// Per-request storage used by app.js and db/index.js to annotate SQL logs with
// the originating API route. This is especially useful when one frontend screen
// triggers several SWR/cache fetches at once.
const requestContext = new AsyncLocalStorage();

module.exports = requestContext;
