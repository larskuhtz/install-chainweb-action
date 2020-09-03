# Github Action for installing chainweb-node applications

Supported platforms:

* ubuntu-16.04
* ubuntu-18.04
* ubuntu-20.04
* macOS-latest

## Parameters:

```yml
inputs:
  version:
    description: |
      Chainweb-node version to be installed.
      Either a release, the first 7 hex digits of the git revsion, 'latest', or 'master'.
      Default: 'latest'
    required: false
  ghc_version:
    description: |
      GHC compiler version that was used for the build.
      Default: ghc-8.10.2
    required: false
  github_token:
    description: Github API secret
    required: true
```

## Example

```yml
on: [push]

jobs:
  install-chainweb:
    runs-on: ubuntu-latest
    name: Test install-chainweb-action
    steps:
    - name: install latest chainweb-node version
      uses: larskuhtz/install-chainweb-action@master
      with:
        version: 'latest'
        ghc: '8.10.2'
        github_token: ${{ secrets.GITHUB_TOKEN }}
    - name: check chainweb-node
      run: chainweb-node --version
```
