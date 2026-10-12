const { readFileSync, existsSync, statSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const { load } = require('js-yaml');

function verifyRelease(directory, version) {
    const info = load(readFileSync(path.join(directory, 'latest.yml'), 'utf8'));
    if (info.version !== version || !Array.isArray(info.files) || info.files.length !== 1) throw new Error('Unexpected release metadata');
    const file = info.files[0];
    const expected = `Yield-Setup-${version}.exe`;
    if (file.url !== expected || info.path !== expected || info.sha512 !== file.sha512) throw new Error('Installer filename does not match update metadata');
    const installer = path.join(directory, expected);
    if (!existsSync(installer + '.blockmap')) throw new Error('Missing installer blockmap');
    if (statSync(installer).size !== file.size) throw new Error('Installer size mismatch');
    const checksum = createHash('sha512').update(readFileSync(installer)).digest('base64');
    if (checksum !== file.sha512) throw new Error('Installer checksum mismatch');
    return { version, installer: expected };
}
if (require.main === module) {
    const version = require('../package.json').version;
    console.log(verifyRelease(process.argv[2] || path.resolve(__dirname, '../dist'), version));
}
module.exports = { verifyRelease };
