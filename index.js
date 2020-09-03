const core = require("@actions/core");
const cc = require('./lib/InstallChainweb.js');

async function run() {
  try {
    await cc.installChainweb();
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.export = run;

run()
