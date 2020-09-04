const core = require("@actions/core");
const tools = require("@actions/tool-cache");
const path = require('path');

const { execGetOutput, getReleases } = require("./Utils.js");

// Constants
//
const s3_bucket = "kadena-cabal-cache"
const s3_folder = "chainweb-node"
const applications = ["chainweb-node", "chainweb-tests", "cwtool", "bench"]

// Resolve revision
//
async function getVersion (token, str) {
  const releases = await getReleases(token);
  core.debug(`got releases: ${ JSON.stringify(releases) }`);
  if (str === 'latest') {
    return releases[0];
  } else if (str.includes('.')) {
    return releases.find(r => r.release.startsWith(str));
  } else if (str === 'master') {
    return { revision : "master" };
  } else if (/^[a-fA-F0-9]+$/.test(str)) {
    return { revision : str.substr(0,7) };
  }
}

// Determine the operating system version
//
async function getOsRelease() {
  if (process.platform === 'win32') {
    return 'windows-latest';
  } else if (process.platform === 'darwin') {
    return 'macOS-latest';
  } else if (process.platform === 'linux') {
    const distro = await execGetOutput("lsb_release", ["-s", "-i"]);
    if (distro.trim() === 'Ubuntu') {
      const v = await execGetOutput("lsb_release", ["-s", "-r"])
      return `ubuntu-${ v.trim() }`;
    } else {
      throw new Error(`unsupported debian distribution: ${ distro.trim() }`);
    }
  } else {
    throw new Error(`unsupported platform: ${process.platform}`);
  }
}

// Parse inputs and set default values
//
async function getArgs () {

  // ghc version
  var ghc = core.getInput('ghc_version')
  if (!ghc) { ghc = "8.10.2"; }
  core.debug(`ghc-version: ${ ghc }`);

  // github_token
  const token = core.getInput('github_token');
  if (! token) {
    throw new Error('missing github token');
  }

  // version
  let verarg = core.getInput('version')
  if (!verarg) { verarg = "latest"; }
  let version = await getVersion(token, verarg);
  core.debug(`got version: ${ JSON.stringify(version) }`);

  return ({
    revision: version.revision,
    release: version.release,
    ghc: ghc
  });
}

// install chainweb applications and add them to the tool cache
//
async function cacheChainweb(args) {
  const os = await getOsRelease();
  if (os === 'windows-latest') {
    throw new Error ("windows is currently not supported");
  }

  const archive = `chainweb.${ args.ghc }.${ os }.${ args.revision }.tar.gz`;
  const url = `https://${ s3_bucket }.s3.amazonaws.com/${ s3_folder }/${ archive }`;
  core.debug(`chainweb url: ${ url }`);
  core.info(`downloading chainweb-node form ${ url }`);

  const tarPath = await tools.downloadTool(url);
  core.debug(`finished downloading, stored result in ${ tarPath }`);
  const tmpPath = await tools.extractTar(tarPath);
  core.debug(`extracted applications to ${ tmpPath }`);

  if (args.release) {
    core.debug(`Caching chainweb-node-${ args.release }`)
    const cachedPath = await tools.cacheDir(tmpPath, 'chainweb-node', args.release);
    core.debug(`adding path ${ cachedPath }`)
    core.addPath(cachedPath);
    return cachedPath;
  } else {
    core.debug(`adding path ${ tmpPath }`)
    core.addPath(tmpPath);
    return tmpPath;
  }
}

async function installRocksDb() {
  if (process.platform === 'darwin') {
      execGetOutput("brew", ["install", "rocksdb"]);
  } else if (process.platform === 'linux') {
    const distro = await execGetOutput("lsb_release", ["-s", "-i"]);
    if (distro.trim() === 'Ubuntu') {
      execGetOutput("sudo", ["apt-get", "install", "-y", "librocksdb-dev"])
    } else {
      throw new Error(`unsupported debian distribution: ${ distro.trim() }`);
    }
  } else {
    throw new Error(`unsupported platform: ${process.platform}`);
  }
}

// Provide chainweb applications by providing them in the path
//
async function installChainweb(args) {
  core.debug(`args: ${ JSON.stringify(args) }`);
  await installRocksDb();

  if ( args.release ) {
    core.info(`installing chainweb-node version ${ args.release } compiled with GHC-${ args.ghc }.`)
  } else {
    core.info(`installing chainweb-node revision ${ args.revision } compiled with GHC-${ args.ghc }.`)
  }

  var cached = undefined;

  if (args.release) {
    core.debug(`looking in cache for chainweb-node-${ args.release }`)
    cached = tools.find('chainweb-node', args.release);
  }

  if (cached === undefined || cached.length == 0) {
    cached = await cacheChainweb(args);
  } else {
    core.addPath(cached);
  }
  if (cached === undefined || cached.length == 0) {
    throw new Error(`failed to install chaiwneb-node applications from path: ${cached}`);
  }
  return path.join(cached, "chainweb-node");
}

module.exports.installChainweb = async () => installChainweb(await getArgs());
