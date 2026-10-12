// Prismへ渡すOpenAPI正本。実行時のポート・検証バージョンを例へ埋め込む。
function githubUpdatesContract({ version, nextVersion, filesURL }) {
    const object = properties => ({ type: 'object', required: Object.keys(properties), properties });
    const text = { type: 'string' };
    const response = (description, schema, examples, media = 'application/json') => ({
        responses: { 200: { description, content: { [media]: { schema,
            examples: Object.fromEntries(Object.entries(examples).map(([name, value]) => [name, { value }])) } } } },
    });
    const target = { private: true, default_branch: 'main' };
    const ready = { tag_name: `v${nextVersion}` };
    const old = { tag_name: `v${version}` };
    return {
        openapi: '3.0.3', info: { title: 'GitHub personal update contract', version: '1.0.0' },
        paths: {
            '/repos/personal/yield': { get: response('Private repository', object({ private: { type: 'boolean' }, default_branch: text }), {
                building: target, queued: target, failed: target, ready: target, 'public-target': { ...target, private: false },
            }) },
            '/repos/public/yield/releases/latest': { get: response('Public stable release', object({ tag_name: text }), { building: ready, queued: ready, failed: ready, ready }) },
            '/repos/personal/yield/releases/latest': { get: response('Private stable release', object({ tag_name: text }), { building: old, queued: old, failed: old, ready }) },
            '/repos/personal/yield/actions/workflows/dev-pro-release.yml/runs': { get: {
                parameters: [{ name: 'event', in: 'query', schema: text }, { name: 'per_page', in: 'query', schema: { type: 'integer' } }],
                ...response('Workflow runs', object({ workflow_runs: { type: 'array', items: object({ display_title: text, status: text }) } }), {
                    building: { workflow_runs: [] }, queued: { workflow_runs: [{ display_title: `DevPro v${nextVersion}`, status: 'in_progress' }] },
                    failed: { workflow_runs: [{ display_title: `DevPro v${nextVersion}`, status: 'completed', conclusion: 'failure' }] },
                }),
            } },
            '/repos/personal/yield/actions/workflows/dev-pro-release.yml/dispatches': { post: {
                requestBody: { required: true, content: { 'application/json': { schema: object({
                    ref: { type: 'string', enum: ['main'] }, inputs: object({ public_tag: { type: 'string', enum: [`v${nextVersion}`] } }),
                }) } } }, responses: { 204: { description: 'Workflow dispatched' } },
            } },
            '/api/v3/repos/personal/yield/releases/latest': { get: response('Private updater release', object({ tag_name: text, assets: { type: 'array', items: object({ name: text, url: text }) } }), {
                ready: { ...ready, assets: [{ name: 'latest.yml', url: `${filesURL}/latest.yml` }, { name: 'Yield-Test.exe', url: `${filesURL}/Yield-Test.exe` }] },
            }, 'application/vnd.github.v3+json') },
        },
    };
}
module.exports = { githubUpdatesContract };
