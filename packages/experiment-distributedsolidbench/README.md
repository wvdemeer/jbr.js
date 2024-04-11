# How to run jbr experiment distributed solidbench

The `experiment-distributedsolidbench` experiment will run the jbr experiment with solid pods spread over multiple bare real servers.  

## Provision servers

First, set up the servers to run the tests on.

The easiest way is to use [solidlab-env-setup](https://github.com/SolidLabResearch/solidlab-env-setup/) and follow
the instructions in [README-jFed-gui-rspec.md](https://github.com/SolidLabResearch/solidlab-env-setup/blob/main/README-jFed-gui-rspec.md)

An example of the `cookiecutter.json` file to generate the RSpec:
```json
{
    "rspec_name": "jbr32s",
    "server_count": 32,
    "client_count": 1,
    "component_manager_urn": "urn:publicid:IDN+wall1.ilabt.imec.be+authority+cm",
    "disk_image_name": "none",
    "server_hardware_type_name": "pcgen07-1p",
    "client_hardware_type_name": "pcgen07-1p"
}
```

The most important ansible variables to set in `ansible-variables.yaml`:
```yaml
---
install_css: true
install_nginx: false
ss_use_https: true
start_css: true
css_default_checkout_arg: main
install_server_solid_perftest_tools: true
install_client_scripts: true

perftest_agent_start: false

css_default_generate_users: true
css_default_user_count: 1
css_default_generate_content: false
css_default_workers: 0  # 0 should be auto
css_default_notifications: webhooks
css_default_resource_locker: redis
css_default_lock_expiration: false

jbr_client: true
```

Once the servers are running, make `ss_list.txt`, as described in [step 6](https://github.com/SolidLabResearch/solidlab-env-setup/blob/main/README-jFed-gui-rspec.md#step-6-optional-extract-css-root-url-list-json)
(use `ss_list.txt` instead of `all_urls`)

## Configure and run JBR

Login to the machine you'll run jbr on. (The `client` node when using `solidlab-env-setup`).

Give your user docker permissions if needed:
```
usermod -a -G docker $(whoami)
# now log out and then log in again
```

```bash
git clone git@github.com:wvdemeer/jbr.js.git
# If needed: sudo npm install -g yarn
PATH="$HOME/.yarn/bin/:$PATH"
```

Save the solid server URLs to `ss_list.txt` in the `jbr.js` dir. (One line per URL. Base URLs, without path, example: `https://example.com/`)

Remove the "leftover" server from this file, and save it alone to `leftover_host.txt`.

```bash
cd jbr.js
git checkout distribute-iri
yarn install --ignore-engines
```

Check that versions are correct everywhere:
```bash
grep -H -e '"version": "[0-9.]*"' $(find . -iwholename '*/rdf-dataset-fragmenter/package.json')
grep -H -e '"version": "[0-9.]*"' $(find . -iwholename '*/sparql-query-parameter-instantiator/package.json')
```

(Try `yarn install --ignore-engines --check-files` if `rdf-dataset-fragmenter` or `sparql-query-parameter-instantiator` is missing. `yarn cache clean` and install again might also work. `rm -r node_modules/solidbench` and install again was also needed once. Not sure why.)

Minimum required versions:
- `rdf-dataset-fragmenter` version `2.5.0`
- `sparql-query-parameter-instantiator` version `2.6.0`

```
cd packages/jbr
yarn link
cd -
SOLID_SERVERS_FILE=$(pwd)/ss_list.txt LEFTOVER_HOSTNAME="$(basename $(cat ~/leftover_host.txt))" jbr init distributedsolidbench test-jbr-1
cd test-jbr-1
mkdir -p generated/out-validate
mkdir -p output/logs
HACK_FOR_DISTRIBUTED_SOLIDBENCH=true jbr set-hook hookSparqlEndpoint sparql-endpoint-comunica
```

`jbr-experiment.json` in `test-jbr-1` should have the correct `serverBaseUrls` set.
`input/config-fragmenter.json` and `input/config-queries.json` as well.

Prepare:
```bash
cd test-jbr-1
jbr prepare -v 2>&1 | tee prepare.log
```

Optional:
- Edit `input/dockerfiles/Dockerfile-client` and remove the hash on the first line, so it becomes:

  ```dockerfile
  FROM comunica/query-sparql-link-traversal-solid:dev
  ```

Run a local CSS:
```bash
cd test-jbr-1
NODE_DNS="$(cat /var/emulab/boot/nodeid).wall1.ilabt.imec.be"
npx @solid/community-server@6.1.0 -c input/css-localhost-3003-config.json -f generated/out-fragments/http/localhost_3003/ --port 3003 --baseUrl "http://${NODE_DNS}:3003"
```

Run:
```bash
mkdir -p output/logs
jbr run -v 2>&1 | tee run.log
```

Tip: The scripts in `jbr.js/distributedsolidbench-scripts` can be handy to automate running experiments.
