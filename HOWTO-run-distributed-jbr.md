# Run 

## Easy

Give your user docker permissions if needed:
```
usermod -a -G docker $(whoami)  # then login again
```

```bash
git clone git@github.com:wvdemeer/jbr.js.git
# If needed: sudo npm install -g yarn
PATH="$HOME/.yarn/bin/:$PATH"
```

Save the solid server URLs to `ss_list.txt` in the `jbr.js` dir. (One line per URL. Base URLs, without path, example: `https://example.com/`)

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
SOLID_SERVERS_FILE=$(pwd)/ss_list.txt jbr init distributedsolidbench test-jbr-1
cd test-jbr-1
mkdir -p output/logs
jbr set-hook hookSparqlEndpoint sparql-endpoint-comunica
```

`jbr-experiment.json` in `test-jbr-1` should have the correct `serverBaseUrls` set.
`input/config-fragmenter.json` and `input/config-queries.json` as well.

Edit `input/dockerfiles/Dockerfile-client` and add `--lenient --showStackTrace` to the `CMD` on the last line

Prepare:
```bash
cd test-jbr-1
curl 'https://raw.githubusercontent.com/comunica/Experiments-Solid-Link-Traversal/master/experiments/queries-discover/input/dockerfiles/Dockerfile-client' > input/dockerfiles/Dockerfile-client
curl 'https://raw.githubusercontent.com/comunica/Experiments-Solid-Link-Traversal/master/experiments/queries-discover/input/context-client.json' > input/context-client.json
echo '{ "@context": [ "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/config-query-sparql/^2.0.0/components/context.jsonld", "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/config-query-sparql-link-traversal/^0.0.0/components/context.jsonld" ], "import": [ "ccqslt:config/config-base.json" ] }' > input/config-client.json 
jbr prepare -v 2>&1 | tee prepare.log
```

Run:
```bash
mkdir -p output/logs
jbr run -v 2>&1 | tee run.log
```


## Development setup

Uses https://www.npmjs.com/package/yalc for local dev deps

Give your user docker permissions if needed:
```
usermod -a -G docker $(whoami)  # then login again
```

```bash
git clone https://github.com/twalcari/rdf-dataset-fragmenter.js.git 
git clone git@github.com:wvdemeer/sparql-query-parameter-instantiator.js.git
git clone git@github.com:wvdemeer/jbr.js.git
# If needed: sudo npm install -g yarn
yarn global add yalc
PATH="$HOME/.yarn/bin/:$PATH"
```

```bash
cd rdf-dataset-fragmenter.js
git checkout distribute-iri
yarn install
yarn run build
yalc publish
```


```bash
cd sparql-query-parameter-instantiator.js
git checkout distribute-iri-value-transf
yarn install
yarn run build
yalc publish
```

Save the solid server URLs to `ss_list.txt` in the `jbr.js` dir. (One line per URL. Base URLs, without path, example: `https://example.com/`)

```bash
cd jbr.js
git checkout distribute-iri
yalc add rdf-dataset-fragmenter
yalc add sparql-query-parameter-instantiator
yarn install --ignore-engines
cd packages/jbr
yarn link
cd -
SOLID_SERVERS_FILE=$(pwd)/ss_list.txt jbr init distributedsolidbench test-jbr-1
cd test-jbr-1
jbr set-hook hookSparqlEndpoint sparql-endpoint-comunica
```

`jbr-experiment.json` in `test-jbr-1` should have the correct `serverBaseUrls` set.
`input/config-fragmenter.json` and `input/config-queries.json` as well.

Check that versions are correct everywhere (make sure to modify your dev code's version to recognize them):
```bash
grep -e '"version": "[0-9.]*"' $(find . -iwholename '*/rdf-dataset-fragmenter/package.json')
grep -e '"version": "[0-9.]*"' $(find . -iwholename '*/sparql-query-parameter-instantiator/package.json')
```

Minimum required versions:
- `rdf-dataset-fragmenter` version `2.5.0`
- `sparql-query-parameter-instantiator` version `2.6.0`


If these differ, do:
```bash
rm -r ./node_modules/solidbench/node_modules/rdf-dataset-fragmenter
cp -a ./node_modules/rdf-dataset-fragmenter ./node_modules/solidbench/node_modules/rdf-dataset-fragmenter
```

Prepare:
```bash
cd test-jbr-1
curl 'https://raw.githubusercontent.com/comunica/Experiments-Solid-Link-Traversal/master/experiments/queries-discover/input/dockerfiles/Dockerfile-client' > input/dockerfiles/Dockerfile-client
curl 'https://raw.githubusercontent.com/comunica/Experiments-Solid-Link-Traversal/master/experiments/queries-discover/input/context-client.json' > input/context-client.json 
jbr prepare -v
```

Run:
```bash
mkdir output/log
jbr run -v
```
