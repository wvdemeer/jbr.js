
Uses https://www.npmjs.com/package/yalc for local dev deps

```bash
git clone https://github.com/twalcari/rdf-dataset-fragmenter.js.git 
git clone git@github.com:wvdemeer/jbr.js.git
yarn global add yalc
PATH="$HOME/.yarn/bin/:$PATH"
```

```bash
cd rdf-dataset-fragmenter.js
yarn install
yarn run build
yalc publish
```

```bash
cd jbr.js
yalc add rdf-dataset-fragmenter
yarn install --ignore-engines
jbr init distributedsolidbench test-jbr-1
cd test-jbr-1
jbr set-hook hookSparqlEndpoint sparql-endpoint-comunica
```

Edit `jbr-experiment.json` in `test-jbr-1`:
- Change `serverBaseUrls` to the list of server URLs

Run:
```
cd test-jbr-1
jbr prepare
```
