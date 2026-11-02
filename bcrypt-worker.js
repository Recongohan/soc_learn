// Runs bcrypt on a separate thread so a login or password change never blocks other requests.
// (bcryptjs's own "async" mode schedules its chunks with process.nextTick, which does not yield to I/O.)
const { parentPort } = require('worker_threads');
const bcrypt = require('bcryptjs');

parentPort.on('message', ({ id, op, a, b }) => {
  try {
    let result;
    if (op === 'compare') result = bcrypt.compareSync(a, b);
    else if (op === 'hash') result = bcrypt.hashSync(a, b);
    else throw new Error(`unknown op ${op}`);
    parentPort.postMessage({ id, ok: true, result });
  } catch (e) {
    parentPort.postMessage({ id, ok: false, error: String(e && e.message) });
  }
});
