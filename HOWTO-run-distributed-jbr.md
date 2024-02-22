
Uses https://www.npmjs.com/package/yalc for local dev deps

Give your user docker permissions if needed:
```
usermod -a -G docker $(whoami)  # then login again
```

```bash
git clone https://github.com/twalcari/rdf-dataset-fragmenter.js.git 
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

Save the solid server URLs to `ss_list.txt` in the `jbr.js` dir. (One line per URL. Base URLs, without path, example: `https://example.com/`)

```bash
cd jbr.js
git checkout distribute-iri
yalc add rdf-dataset-fragmenter
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

Check that things are not fucked up:
```bash
grep '"version"' ./node_modules/rdf-dataset-fragmenter/package.json ./node_modules/solidbench/node_modules/rdf-dataset-fragmenter/package.json
```

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
jbr run -v
```
