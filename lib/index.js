const core = require("@actions/core");
const cc = require('./InstallChainweb.js');

async function run() {
  try {
    await cc.installChainweb();
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.export = run;

run()
