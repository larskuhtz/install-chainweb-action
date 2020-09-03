const core = require("@actions/core");
const exec = require("@actions/exec");
const tools = require("@actions/tool-cache");
const github = require('@actions/github');
const path = require('path');

const s3_bucket = "kadena-cabal-cache"
const s3_folder = "chainweb-node"
const applications = ["chainweb-node", "chainweb-tests", "cwtool", "bench"]

async function execWithOutput(proc, args) {
  let output = '';
  let error = '';

  const options = {};
  options.listeners = {
    stdout: data => {
      output += data.toString();
    },
    stderr: data => {
      error += data.toString();
    }
  };
  const s = await exec.exec(proc, args, options);
  return {
    output: output,
    error: error,
    status: s
  };
}

async function getReleases (token) {
  const octokit = github.getOctokit(token);

  const query = `query releases($name: String!, $owner: String!)
    {
      repository(name: $name, owner: $owner) {
        releases(orderBy: {field: CREATED_AT, direction: DESC}, first: 20) {
          edges {
            node {
              tag {
                target {
                  abbreviatedOid
                }
              }
              tagName
            }
          }
        }
      }
    }
  `;

  const variables = { "owner": "kadena-io", "name": "chainweb-node" };
  const result = await octokit.graphql(query, variables);
  return result.repository.releases.edges.map(i => ({
    release: i.node.tagName,
    revision: i.node.tag.target.abbreviatedOid
  }));
}

// Resolve revision
//
async function getVersion (token, str) {
  const releases = await getReleases(token);
  core.debug(`got releases: ${ JSON.stringify(releases) }`);
  if (str === 'latest') {
    return releases[0];
  } else if (str.includes('.')) {
    return releases.find(r => r.release.startsWith(str));
  } else if ('master') {
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
    try {
      const distro = await exec.exec("lsb_release", ["-i", "-s"]);
      if (distro === 'Ubuntu') {
        const v = await exec.exec("lsb_release", ["-r", "-s"]);
        return `ubuntu-${ v }`;
      } else {
        throw new Error(`unsupported debian distribution: ${distro}`);
      }
    } catch {
      throw new Error(`unsupported linux distribution: lsb_release command not found`);
    }
  } else {
    throw new Error(`unsupported platform: ${process.platform}`);
  }
}

// Parse inputs and set default values
//
async function getArgs () {

  var ghc = core.getInput('ghc_version')
  if (!ghc) { ghc = "8.10.2"; }
  core.debug(`ghc-version: ${ ghc }`);

  var verarg = core.getInput('version')
  if (!verarg) { verarg = "latest"; }
  const token = core.getInput('github_token');
  var version = await getVersion(token, verarg);
  core.debug(`got version: ${ JSON.stringify(version) }`);

  return ({
    os: core.getInput('os'),
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

  const tarPath = await tools.downloadTool(url);
  const tmpPath = await tools.extractTar(tarPath);

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

// Provide chainweb applications by providing them in the path
//
async function installChainweb(args) {
  core.debug(`args: ${ JSON.stringify(args) }`);
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
  if (!cached) {
    throw new Error(`failed to install chaiwneb-node applications from path: ${cached}`);
  }
  return path.join(cached, "chainweb-node");
}

module.exports.installChainweb = async () => installChainweb(await getArgs());
module.exports.execWithOutput= execWithOutput;
