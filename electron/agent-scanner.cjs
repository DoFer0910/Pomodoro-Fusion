const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');

const IDLE_GAP_SECONDS = 300;
const cache = new Map();

// These are observed event ranges, never inferred human attendance intervals.
function summarizeTimestamps(timestamps) {
    const sorted = [...new Set(timestamps)].filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return null;
    const activityIntervals = [];
    let range = { start: sorted[0], end: sorted[0] };
    let activeMs = 0;
    for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1];
        if (gap < IDLE_GAP_SECONDS * 1000) {
            range.end = sorted[i];
            activeMs += gap;
        } else {
            activityIntervals.push(range);
            range = { start: sorted[i], end: sorted[i] };
        }
    }
    activityIntervals.push(range);
    return { startTimestamp: sorted[0], lastTimestamp: sorted.at(-1),
        durationSeconds: Math.round(activeMs / 1000), activityIntervals };
}

function parseAgentContent(content, source, sessionId) {
    let repoPath = null;
    const timestamps = [];
    if (source === 'codex') {
        const firstLine = content.split('\n').find(line => line.trim());
        let meta;
        try { meta = JSON.parse(firstLine || 'null'); } catch { /* Skip incomplete lines below. */ }
        if (meta?.type === 'session_meta' && meta.payload) {
            if (meta.payload.source && typeof meta.payload.source === 'object' && meta.payload.source.subagent) return null;
            if (typeof meta.payload.cwd === 'string') repoPath = meta.payload.cwd;
        }
    }
    for (const line of content.split('\n')) {
        const tsMatch = line.match(/"timestamp"\s*:\s*"([^"]+)"/);
        if (tsMatch) {
            const ms = Date.parse(tsMatch[1]);
            if (Number.isFinite(ms)) timestamps.push(ms);
        }
        if (!repoPath) {
            const match = line.match(/"cwd"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (match) {
                try { repoPath = JSON.parse(`"${match[1]}"`); } catch { /* Invalid cwd is not matched. */ }
            }
        }
    }
    const timing = summarizeTimestamps(timestamps);
    if (!timing) return null;
    return { [source === 'codex' ? 'codexSessionId' : 'claudeSessionId']: sessionId, repoPath, ...timing };
}

function parseFile(filePath, source) {
    const stat = fs.statSync(filePath);
    const previous = cache.get(filePath);
    if (previous?.mtimeMs === stat.mtimeMs && previous.size === stat.size) return previous.result;
    const result = parseAgentContent(fs.readFileSync(filePath, 'utf8'), source, path.basename(filePath, '.jsonl'));
    cache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, result });
    return result;
}

function scanAgentDirectory(root, source) {
    const results = [];
    function visit(dir, depth) {
        if (depth > (source === 'codex' ? 5 : 1)) return;
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
        catch (error) {
            // An agent not installed is different from a directory that cannot be read.
            if (dir === root && error.code === 'ENOENT') return;
            throw error;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) visit(full, depth + 1);
            else if (entry.name.endsWith('.jsonl')) {
                try {
                    const result = parseFile(full, source);
                    if (result) results.push(result);
                } catch (error) {
                    if (error.code !== 'ENOENT') throw error;
                }
            }
        }
    }
    visit(root, 0);
    return results;
}

let worker = null;
let nextId = 0;
const requests = new Map();

function shutdownAgentScanner() {
    if (worker) void worker.terminate();
    worker = null;
    for (const request of requests.values()) request.reject(new Error('AI scanner stopped'));
    requests.clear();
}

// Full initial scans may read large log histories. Keep this off Electron's UI/main thread.
function scanAgentDirectoryAsync(root, source) {
    if (!worker) {
        const current = new Worker(path.join(__dirname, 'agent-scan-worker.cjs'));
        worker = current;
        current.on('message', message => {
            const request = requests.get(message.id);
            if (!request) return;
            requests.delete(message.id);
            if (message.error) request.reject(new Error(message.error));
            else request.resolve(message.results);
        });
        current.on('error', () => { if (worker === current) shutdownAgentScanner(); });
        current.on('exit', () => { if (worker === current) shutdownAgentScanner(); });
        current.unref();
    }
    return new Promise((resolve, reject) => {
        const id = ++nextId;
        requests.set(id, { resolve, reject });
        worker.postMessage({ id, root, source });
    });
}

module.exports = { summarizeTimestamps, parseAgentContent, scanAgentDirectory, scanAgentDirectoryAsync, shutdownAgentScanner };
