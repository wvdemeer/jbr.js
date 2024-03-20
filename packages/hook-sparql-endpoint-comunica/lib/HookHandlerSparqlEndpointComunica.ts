import Path from 'path';
import * as fs from 'fs-extra';
import type { IExperimentPaths } from 'jbr';
import { HookHandler } from 'jbr';
import { HookSparqlEndpointComunica } from './HookSparqlEndpointComunica';

/**
 * Hook handler for a Comunica-based SPARQL endpoint.
 */
export class HookHandlerSparqlEndpointComunica extends HookHandler<HookSparqlEndpointComunica> {
  public constructor() {
    super('sparql-endpoint-comunica', HookSparqlEndpointComunica.name);
  }

  public getDefaultParams(experimentPaths: IExperimentPaths): Record<string, any> {
    return {
      dockerfileClient: 'input/dockerfiles/Dockerfile-client',
      resourceConstraints: {
        '@type': 'StaticDockerResourceConstraints',
        cpu_percentage: 100,
      },
      configClient: 'input/config-client.json',
      contextClient: 'input/context-client.json',
      additionalBinds: [ ],
      clientPort: 3_001,
      clientLogLevel: 'info',
      queryTimeout: 300,
      maxMemory: 8_192,
    };
  }

  public getSubHookNames(): string[] {
    return [];
  }

  public async init(experimentPaths: IExperimentPaths, hookHandler: HookSparqlEndpointComunica): Promise<void> {
    // eslint-disable-next-line no-process-env
    const hack_for_distributed_solidbench = process.env.HACK_FOR_DISTRIBUTED_SOLIDBENCH === 'true';

    // Create Dockerfile for client
    if (!await fs.pathExists(Path.join(experimentPaths.input, 'dockerfiles'))) {
      await fs.mkdir(Path.join(experimentPaths.input, 'dockerfiles'));
    }
    if (!hack_for_distributed_solidbench) {
      await fs.copyFile(Path.join(__dirname, 'templates', 'dockerfiles', 'Dockerfile-client'),
        Path.join(experimentPaths.input, 'dockerfiles', 'Dockerfile-client'));
    } else {
      await fs.copyFile(Path.join(__dirname, 'templates', 'distributed-solidbench', 'dockerfiles', 'Dockerfile-client'),
        Path.join(experimentPaths.input, 'dockerfiles', 'Dockerfile-client'));
    }

    // Create config for client
    if (!await fs.pathExists(Path.join(experimentPaths.input))) {
      await fs.mkdir(Path.join(experimentPaths.input));
    }
    if (!hack_for_distributed_solidbench) {
      await fs.copyFile(Path.join(__dirname, 'templates', 'input', 'config-client.json'),
        Path.join(experimentPaths.input, 'config-client.json'));
      await fs.copyFile(Path.join(__dirname, 'templates', 'input', 'context-client.json'),
        Path.join(experimentPaths.input, 'context-client.json'));
    } else {
      await fs.copyFile(Path.join(__dirname, 'templates', 'distributed-solidbench', 'input', 'config-client.json'),
        Path.join(experimentPaths.input, 'config-client.json'));
      await fs.copyFile(Path.join(__dirname, 'templates', 'distributed-solidbench', 'input', 'context-client.json'),
        Path.join(experimentPaths.input, 'context-client.json'));
    }
  }
}
