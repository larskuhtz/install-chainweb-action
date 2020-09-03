const exec = require("@actions/exec");
const process = require('process');
const cp = require('child_process');
const tmp = require('tmp');
const path = require('path');
const ic = require('./lib/InstallChainweb.js');

test('test setup', async () => {
  expect.assertions(3);
  const tmpDir = tmp.dirSync({ "prefix": "install-chainweb-action-test", "unsafeCleanup": true});

  process.env['RUNNER_TOOL_CACHE'] = `${tmpDir.name}/cache`;
  process.env['RUNNER_TEMP'] = `${tmpDir.name}/tmp`;

  process.env['INPUT_GHC_VERSION'] = '8.10.1';
  process.env['INPUT_VERSION'] = '2.1';
  process.env['INPUT_GITHUB_TOKEN'] = process.env['GITHUB_TOKEN'];

  await ic.installChainweb();
  exec.exec
  const result = await ic.execWithOutput("chainweb-node", ["--version"]);
  expect(result.status.toString()).toMatch('0');
  expect(result.error).toMatch('');
  expect(result.output).toMatch('chainweb-node-2.1 (package chainweb-2.1 revision 2.1-6f29cef-HEAD)');

  tmpDir.removeCallback();
}, 10000);

