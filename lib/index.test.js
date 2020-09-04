const process = require('process');
const tmp = require('tmp');
const ic = require('./InstallChainweb.js');
const { execGetOutput } = require('./Utils.js');

describe('Install Chainweb Node', () => {

  const tmpDir = tmp.dirSync({ "prefix": "install-chainweb-action-test", "unsafeCleanup": true});

  process.env['INPUT_GITHUB_TOKEN'] = process.env['GITHUB_TOKEN'];
  process.env['RUNNER_TOOL_CACHE'] = `${tmpDir.name}/cache`;
  process.env['RUNNER_TEMP'] = `${tmpDir.name}/tmp`;

  afterAll(() => { tmpDir.removeCallback(); });

  it('Install 2.1 - GHC-8.10.1', async () => {
    process.env['INPUT_GHC_VERSION'] = '8.10.1';
    process.env['INPUT_VERSION'] = '2.1';
    await ic.installChainweb();
    const result = await execGetOutput("chainweb-node", ["--version"]);
    expect(result).toMatch('chainweb-node-2.1 (package chainweb-2.1 revision 2.1-6f29cef-HEAD)');
  }, 20000);

  it('Install latest (which currently is version 2.* build with 8.10.1)', async () => {
    process.env['INPUT_GHC_VERSION'] = '8.10.1';
    process.env['INPUT_VERSION'] = 'latest';
    await ic.installChainweb();
    const result = await execGetOutput("chainweb-node", ["--version"]);
    expect(result).toMatch(/chainweb-node-2\.\d+ \(package chainweb-2\.\d+ revision 2\.\d+/);
  }, 20000);

  it('Install latest as default (which currently is version 2.* build with 8.10.1)', async () => {
    process.env['INPUT_GHC_VERSION'] = '8.10.1';
    delete process.env.INPUT_VERSION;
    await ic.installChainweb();
    const result = await execGetOutput("chainweb-node", ["--version"]);
    expect(result).toMatch(/chainweb-node-2\.\d+ \(package chainweb-2\.\d+ revision 2\.\d+/);
  }, 20000);

  it('Install master', async () => {
    process.env['INPUT_GHC_VERSION'] = '8.10.1';
    process.env['INPUT_VERSION'] = 'master';
    await ic.installChainweb();
    const result = await execGetOutput("chainweb-node", ["--version"]);
    expect(result).toMatch(/^chainweb-node-/);
  }, 20000);

});
