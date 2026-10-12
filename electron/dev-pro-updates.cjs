const { execFile } = require('node:child_process');

function runGitHub(args) {
    return new Promise((resolve, reject) => {
        execFile('gh', args, { windowsHide: true, timeout: 30_000, maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                // CLIの例外オブジェクトはstdout（auth tokenの場合は認証情報）を含むため渡さない。
                const failure = new Error('GitHubの確認に失敗しました。ghのログインとリポジトリ権限を確認してください。');
                failure.notFound = /HTTP 404|Not Found.*404/.test(stderr ?? '');
                reject(failure);
            } else resolve(stdout.trim());
        });
    });
}

function stableVersion(tag) {
    const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag ?? '');
    return match ? match.slice(1).map(Number) : null;
}
function newerThan(tag, installed) {
    const next = stableVersion(tag), current = stableVersion(installed);
    if (!next || !current) throw new Error('安定版のバージョン番号を確認できません。');
    for (let index = 0; index < 3; index++) if (next[index] !== current[index]) return next[index] > current[index];
    return false;
}

function createDevProPreparation({ repository, publicRepository, installedVersion, updater, run = runGitHub }) {
    const read = async endpoint => JSON.parse(await run(['api', endpoint]));
    const latest = async repo => {
        try { return await read(`repos/${repo}/releases/latest`); }
        catch (error) { if (error.notFound) return null; throw error; }
    };
    let requested = null;
    return async ({ manual = false } = {}) => {
        // 公開repoや権限のないrepoに本人用ビルドを依頼しない。
        const target = await read(`repos/${repository}`);
        if (target.private !== true) throw new Error('本人用Proの更新先は非公開リポジトリに限ります。');
        const released = await latest(publicRepository);
        const personal = await latest(repository);
        if (released && newerThan(released.tag_name, installedVersion)
            && (!personal || newerThan(released.tag_name, personal.tag_name))) {
            const version = released.tag_name.replace(/^v/, '');
            const runs = await read(`repos/${repository}/actions/workflows/dev-pro-release.yml/runs?event=workflow_dispatch&per_page=100`);
            const matching = runs.workflow_runs.find(item => item.display_title === `DevPro v${version}`);
            if (matching?.status === 'completed' && !manual) {
                throw new Error('本人用Proのビルドが完了しても配布版を取得できません。Actionsの結果を確認し、「更新を確認」で再試行してください。');
            }
            const pending = matching && matching.status !== 'completed';
            const registering = !matching && requested?.version === version && Date.now() - requested.at < 60_000;
            if (!pending && !registering) {
                await run(['api', `repos/${repository}/actions/workflows/dev-pro-release.yml/dispatches`,
                    '--method', 'POST', '-f', `ref=${target.default_branch}`, '-f', `inputs[public_tag]=${released.tag_name}`]);
                requested = { version, at: Date.now() };
            }
            return { skip: true, status: 'building', updateVersion: version };
        }
        if (!personal) throw new Error('本人用Proの配布版がまだありません。初回ビルドを実行してください。');
        // 認証はこのPCのghから取得し、通信中のメモリだけに渡す。設定や配布物には書かない。
        const token = await run(['auth', 'token', '--hostname', 'github.com']);
        if (!token) throw new Error('GitHubにログインしてください。');
        const [owner, repo] = repository.split('/');
        updater.setFeedURL({ provider: 'github', owner, repo, private: true, token });
        return null;
    };
}

module.exports = { runGitHub, stableVersion, newerThan, createDevProPreparation };
