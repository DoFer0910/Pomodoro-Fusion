const { execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync, appendFileSync } = require('node:fs');
const path = require('node:path');

function parseVersion(value) {
    const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
    if (!match) return null;
    const parts = match.slice(1).map(Number);
    return parts.every(Number.isSafeInteger) ? parts : null;
}
function compare(a, b) {
    for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] - b[index];
    return 0;
}
function nextVersion(packageVersion, tags) {
    let latest = parseVersion(packageVersion);
    if (!latest) throw new Error('Package version must be a stable x.y.z version');
    for (const tag of tags) {
        const candidate = parseVersion(tag);
        if (candidate && compare(candidate, latest) > 0) latest = candidate;
    }
    if (!Number.isSafeInteger(latest[2] + 1)) throw new Error('Version patch overflow');
    return `${latest[0]}.${latest[1]}.${latest[2] + 1}`;
}
function prepareRelease(root, tags) {
    const packagePath = path.join(root, 'package.json');
    const lockPath = path.join(root, 'package-lock.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    const version = nextVersion(pkg.version, tags);
    pkg.version = lock.version = lock.packages[''].version = version;
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    return version;
}
if (require.main === module) {
    const repository = process.env.GITHUB_REPOSITORY;
    if (!repository || !process.env.GITHUB_OUTPUT) throw new Error('Run this command in the release workflow');
    const gitTags = execFileSync('git', ['tag', '--list'], { encoding: 'utf8' });
    const releaseTags = execFileSync('gh', ['api', '--paginate', `repos/${repository}/releases`, '--jq', '.[].tag_name'], { encoding: 'utf8' });
    const version = prepareRelease(path.resolve(__dirname, '..'), (gitTags + '\n' + releaseTags).split(/\r?\n/));
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ntag=v${version}\n`);
    console.log(`Release version: ${version}`);
}
module.exports = { nextVersion, prepareRelease };
