const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

async function execGetOutput(proc, args) {
  let output = '';
  const options = {};
  options.listeners = {
    stdout: data => { output += data.toString(); },
    stderr: data => { core.error(data.toString()); }
  };
  if (await exec.exec(proc, args, options) > 0) {
    throw new Error(`Command ${ proc } ${ JSON.stringify(args) } exited with status ${ s }`);
  } else {
    return output;
  }
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

module.exports.getReleases = getReleases;
module.exports.execGetOutput = execGetOutput;
