import fs from 'fs';
import * as Path from 'path';
import * as fse from 'fs-extra';
import type { IExperimentPaths } from 'jbr';
import { ExperimentHandler } from 'jbr';
import { Templates } from 'solidbench';
import { ExperimentDistributedSolidBench } from './ExperimentDistributedSolidBench';

/**
 * An experiment handler for the SolidBench social network benchmark.
 */
export class ExperimentHandlerDistributedSolidBench extends ExperimentHandler<ExperimentDistributedSolidBench> {
  public constructor() {
    super('distributedsolidbench', ExperimentDistributedSolidBench.name);
  }

  public getDefaultParams(
    experimentPaths: IExperimentPaths,
  ): Record<string, any> {
    let serverUrls = [ 'http://distributedsolidbench-server1:3000/', 'http://distributedsolidbench-server2:3000/' ];
    // eslint-disable-next-line no-process-env
    const serverFile = process.env.SOLID_SERVERS_FILE;
    if (serverFile) {
      // eslint-disable-next-line no-sync
      const fileContent = fs.readFileSync(serverFile, 'utf-8');
      serverUrls = fileContent.split(/\r?\n|\r|\n/ug).filter(str => str.trim().length > 0);
    }
    const queryRunnerUpQueryPodFile = `${serverUrls[0]}/users00000000000000000094/profile/card#me`;
    return {
      scale: '0.1',
      configGenerateAux: 'input/config-enhancer.json',
      configFragment: 'input/config-fragmenter.json',
      configFragmentAux: 'input/config-fragmenter-auxiliary.json',
      configQueries: 'input/config-queries.json',
      configServer: 'input/config-server.json',
      validationParamsUrl: Templates.VALIDATION_PARAMS_URL,
      configValidation: 'input/config-validation.json',
      hadoopMemory: '4G',

      endpointUrl: 'http://localhost:3001/sparql',
      serverBaseUrls: serverUrls,
      serverAuthorization: 'WAC',
      queryRunnerReplication: 3,
      queryRunnerWarmupRounds: 1,
      queryRunnerRecordTimestamps: true,
      queryRunnerRecordHttpRequests: true,
      queryRunnerUpQuery: `SELECT * WHERE { <${queryRunnerUpQueryPodFile}> a ?o } LIMIT 1`,
      queryRunnerUrlParamsInit: {},
      queryRunnerUrlParamsRun: {},
    };
  }

  public getHookNames(): string[] {
    return [ 'hookSparqlEndpoint' ];
  }

  public async init(
    experimentPaths: IExperimentPaths,
    experiment: ExperimentDistributedSolidBench,
  ): Promise<void> {
    const writeConfigFragments = async(): Promise<void> => {
      const dfcp = await fse.readJSON(
        Path.join(__dirname, 'templates', 'distributed-fragmenter-config-pod.json'),
      );
      const distributeIriTransformer = dfcp.transformers[3];

      if (distributeIriTransformer['@type'] !== 'QuadTransformerDistributeIri') {
        throw new Error('Expected an QuadTransformerDistributeIri. ' +
            'Check your distributed-fragmenter-config-pod.json template file');
      }

      distributeIriTransformer.replacementStrings = [ ...experiment.serverBaseUrls.map(baseUrl => `${baseUrl}${baseUrl.endsWith('/') ? '' : '/'}users$1/profile/card#me`) ];
      await fse.writeJSON(
        Path.join(experimentPaths.root, experiment.configFragment),
        dfcp,
        { replacer: null, spaces: 3 },
      );
    };

    // We do this first, instead of in the Promise.all below
    // Because for some reason, it doesn't execute inside the Promise.all
    await writeConfigFragments();

    // Copy config templates
    await Promise.all([
      fse.copyFile(
        Templates.ENHANCEMENT_CONFIG,
        Path.join(experimentPaths.root, experiment.configGenerateAux),
      ),
      fse.copyFile(
        Templates.ENHANCEMENT_FRAGMENT_CONFIG,
        Path.join(experimentPaths.root, experiment.configFragmentAux),
      ),
      fse.copyFile(
        Templates.QUERY_CONFIG,
        Path.join(experimentPaths.root, experiment.configQueries),
      ),
      fse.copyFile(
        Templates.SERVER_CONFIG,
        Path.join(experimentPaths.root, experiment.configServer),
      ),
      fse.copyFile(
        Templates.VALIDATION_CONFIG,
        Path.join(experimentPaths.root, experiment.configValidation),
      ),
    ]);

    // Await experiment.replaceBaseUrlInDir(experimentPaths.root);
  }
}
