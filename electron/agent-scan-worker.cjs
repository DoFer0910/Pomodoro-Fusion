const { parentPort } = require('worker_threads');
const { scanAgentDirectory } = require('./agent-scanner.cjs');
parentPort.on('message', ({ id, root, source }) => {
    try { parentPort.postMessage({ id, results: scanAgentDirectory(root, source) }); }
    catch (error) { parentPort.postMessage({ id, error: error.message }); }
});
