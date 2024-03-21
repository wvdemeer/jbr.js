import fs from 'fs/promises';
import type { PathLike } from 'node:fs';
import * as Path from 'path';
import * as v8 from 'v8';
import { populateServersFromDir } from '@imec-ilabt/solid-perftest-tools';
import * as fse from 'fs-extra';
import type {
  Experiment,
  Hook,
  ITaskContext,
  ICleanTargets,
} from 'jbr';
import { ProcessHandlerComposite, secureProcessHandler } from 'jbr';
import { Generator } from 'solidbench/lib/Generator';
import {
  readQueries,
  SparqlBenchmarkRunner,
  writeBenchmarkResults,
} from 'sparql-benchmark-runner';
import { setGlobalDispatcher, Agent } from 'undici';

async function dirExists(dirPath: PathLike): Promise<boolean> {
  let exists: boolean;
  try {
    return (await fs.stat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * An experiment instance for the SolidBench social network benchmark.
 */
export class ExperimentDistributedSolidBench implements Experiment {
  public readonly scale: string;
  public readonly configGenerateAux: string;
  public readonly configFragment: string;
  public readonly configFragmentAux: string;
  public readonly configQueries: string;
  public readonly configServer: string;
  public readonly validationParamsUrl: string;
  public readonly configValidation: string;
  public readonly hadoopMemory: string;
  public readonly hookSparqlEndpoint: Hook;
  public readonly leftoverServerBaseUrl: string;
  public readonly serverBaseUrls: string[];
  public readonly serverAuthorization: 'WAC' | 'ACP' | undefined;
  public readonly endpointUrl: string;
  public readonly queryRunnerReplication: number;
  public readonly queryRunnerWarmupRounds: number;
  public readonly queryRunnerRecordTimestamps: boolean;
  public readonly queryRunnerRecordHttpRequests: boolean;
  public readonly queryRunnerUpQuery: string;
  public readonly queryRunnerUrlParamsInit: Record<string, any>;
  public readonly queryRunnerUrlParamsRun: Record<string, any>;
  public readonly queryTimeoutFallback: number | undefined;

  /**
   * @param scale
   * @param configGenerateAux
   * @param configFragment
   * @param configFragmentAux
   * @param configQueries
   * @param configServer
   * @param validationParamsUrl
   * @param configValidation
   * @param hadoopMemory
   * @param dockerfileServer
   * @param hookSparqlEndpoint
   * @param leftoverServerBaseUrl
   * @param serverBaseUrls
   * @param serverAuthorization
   * @param endpointUrl
   * @param queryRunnerReplication
   * @param queryRunnerWarmupRounds
   * @param queryRunnerRecordTimestamps
   * @param queryRunnerRecordHttpRequests
   * @param queryRunnerUpQuery
   * @param queryRunnerUrlParamsInit - @range {json}
   * @param queryRunnerUrlParamsRun - @range {json}
   * @param queryTimeoutFallback
   */
  public constructor(
    scale: string,
    configGenerateAux: string,
    configFragment: string,
    configFragmentAux: string,
    configQueries: string,
    configServer: string,
    validationParamsUrl: string,
    configValidation: string,
    hadoopMemory: string,
    hookSparqlEndpoint: Hook,
    leftoverServerBaseUrl: string,
    serverBaseUrls: string[],
    serverAuthorization: 'WAC' | 'ACP' | undefined,
    endpointUrl: string,
    queryRunnerReplication: number,
    queryRunnerWarmupRounds: number,
    queryRunnerRecordTimestamps: boolean,
    queryRunnerRecordHttpRequests: boolean,
    queryRunnerUpQuery: string,
    queryRunnerUrlParamsInit: Record<string, any>,
    queryRunnerUrlParamsRun: Record<string, any>,
    queryTimeoutFallback: number | undefined,
  ) {
    this.scale = scale;
    this.configGenerateAux = configGenerateAux;
    this.configFragment = configFragment;
    this.configFragmentAux = configFragmentAux;
    this.configQueries = configQueries;
    this.configServer = configServer;
    this.validationParamsUrl = validationParamsUrl;
    this.configValidation = configValidation;
    this.hadoopMemory = hadoopMemory;
    this.hookSparqlEndpoint = hookSparqlEndpoint;
    this.endpointUrl = endpointUrl;
    this.leftoverServerBaseUrl = leftoverServerBaseUrl;
    this.serverBaseUrls = serverBaseUrls;
    this.serverAuthorization = serverAuthorization;
    this.queryRunnerReplication = queryRunnerReplication;
    this.queryRunnerWarmupRounds = queryRunnerWarmupRounds;
    this.queryRunnerRecordTimestamps = queryRunnerRecordTimestamps;
    this.queryRunnerRecordHttpRequests = queryRunnerRecordHttpRequests;
    this.queryRunnerUpQuery = queryRunnerUpQuery;
    this.queryRunnerUrlParamsInit = queryRunnerUrlParamsInit;
    this.queryRunnerUrlParamsRun = queryRunnerUrlParamsRun;
    this.queryTimeoutFallback = queryTimeoutFallback;
  }

  public getDockerImageName(context: ITaskContext, type: string): string {
    return context.docker.imageBuilder.getImageName(
      context,
      `distributedsolidbench-${type}`,
    );
  }

  public async prepare(
    context: ITaskContext,
    forceOverwriteGenerated: boolean,
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`ExperimentDistributedSolidBench entry this.serverBaseUrls=${this.serverBaseUrls} this.leftoverServerBaseUrl=${this.leftoverServerBaseUrl}`);

    // Validate memory limit
    const minimumMemory = 8192;
    // eslint-disable-next-line no-bitwise
    const currentMemory = v8.getHeapStatistics().heap_size_limit / 1024 / 1024;
    if (currentMemory < minimumMemory) {
      context.logger.warn(
        `SolidBench recommends allocating at least ${minimumMemory} MB of memory, while only ${currentMemory} was allocated.\nThis can be configured using Node's --max_old_space_size option.`,
      );
    }

    // eslint-disable-next-line no-console
    console.log(`ExperimentDistributedSolidBench prepare sparql prepare`);
    // Prepare hook
    await this.hookSparqlEndpoint.prepare(context, forceOverwriteGenerated);

    // eslint-disable-next-line no-console
    console.log(`ExperimentDistributedSolidBench prepare generate`);
    // Prepare dataset
    await new Generator({
      verbose: context.verbose,
      cwd: context.experimentPaths.generated,
      overwrite: forceOverwriteGenerated,
      scale: this.scale,
      enhancementConfig: Path.resolve(context.cwd, this.configGenerateAux),
      fragmentConfig: Path.resolve(context.cwd, this.configFragment),
      enhancementFragmentConfig: Path.resolve(
        context.cwd,
        this.configFragmentAux,
      ),
      queryConfig: Path.resolve(context.cwd, this.configQueries),
      validationParams: this.validationParamsUrl,
      validationConfig: Path.resolve(context.cwd, this.configValidation),
      hadoopMemory: this.hadoopMemory,
    }).generate();

    // Replace prefix URLs to correct base URL in queries directory
    // await this.replaceBaseUrlInDir(
    //   Path.resolve(context.experimentPaths.generated, 'out-queries'),
    // );

    const urlToDirMap: Record<string, string> = Object.fromEntries(this.serverBaseUrls.map(sbu => {
      const url = new URL(sbu);
      const protocol = url.protocol.endsWith(':') ? url.protocol.slice(0, -1) : url.protocol;
      let dir = Path.join(context.experimentPaths.generated, 'out-fragments', protocol, url.hostname);
      if (url.port) {
        dir += `_${url.port}`;
      }
      return [ sbu, dir ];
    }));

    // If not localhost serving leftover files, upload leftover files as well.
    const leftoverServerBaseUrl = new URL(this.leftoverServerBaseUrl);
    const leftoverServerHostname = leftoverServerBaseUrl.hostname;
    if (leftoverServerHostname !== 'localhost' && leftoverServerHostname !== '127.0.0.1' &&
        leftoverServerHostname.includes('.')) {
      const protocol = leftoverServerBaseUrl.protocol.endsWith(':') ?
        leftoverServerBaseUrl.protocol.slice(0, -1) :
        leftoverServerBaseUrl.protocol;
      const port = leftoverServerBaseUrl.port;
      // eslint-disable-next-line no-console
      console.log(`ExperimentDistributedSolidBench adding uploads for leftovers: 
                   leftoverServerHostname=${leftoverServerHostname} leftoverServerBaseUrl=${leftoverServerBaseUrl}
                   protocol=${protocol} port=${port}`);
      let dir = Path.join(context.experimentPaths.generated, 'out-fragments', protocol, leftoverServerBaseUrl.hostname);
      if (port) {
        const dirWithPort = `_${port}`;
        if (!await dirExists(dir) && await dirExists(dirWithPort)) {
          dir = dirWithPort;
        }
      }
      urlToDirMap[this.leftoverServerBaseUrl] = dir;
    } else {
      // eslint-disable-next-line no-console
      console.log(`ExperimentDistributedSolidBench NOT adding uploads for leftovers: 
                   leftoverServerHostname=${leftoverServerHostname} leftoverServerBaseUrl=${leftoverServerBaseUrl}`);
    }

    // eslint-disable-next-line no-console
    console.log(`ExperimentDistributedSolidBench entry urlToDirMap=${JSON.stringify(urlToDirMap)}`);

    const populateCacheDir = Path.join(context.experimentPaths.generated, 'populate-cache');
    let exists: boolean;
    try {
      exists = (await fs.stat(populateCacheDir)).isDirectory();
    } catch {
      exists = false;
    }
    if (!exists) {
      await fs.mkdir(populateCacheDir, { recursive: false });
    }

    // eslint-disable-next-line no-console
    console.log(`ExperimentDistributedSolidBench prepare populateServersFromDir`);
    const createdUserInfo = await populateServersFromDir({
      verbose: context.verbose,
      urlToDirMap,
      authorization: this.serverAuthorization,
      populateCacheDir,
      maxParallelism: 30,
    });

    // eslint-disable-next-line no-console
    console.log(`ExperimentDistributedSolidBench exit createdUserInfo.length=${createdUserInfo.length}`);
  }

  public async run(context: ITaskContext): Promise<void> {
    // Prevent BodyTimeoutError: Body Timeout Error UND_ERR_BODY_TIMEOUT
    setGlobalDispatcher(new Agent({ bodyTimeout: 900e3 }));

    // Setup SPARQL endpoint
    const endpointProcessHandler = await this.hookSparqlEndpoint.start(
      context,
    );

    const processHandler = new ProcessHandlerComposite([
      endpointProcessHandler,
    ]);
    const closeProcess = secureProcessHandler(processHandler, context);

    // Initiate SPARQL benchmark runner
    let stopStats: () => void;
    const results = await new SparqlBenchmarkRunner({
      endpoint: this.endpointUrl,
      querySets: await readQueries(
        Path.join(context.experimentPaths.generated, 'out-queries'),
      ),
      replication: this.queryRunnerReplication,
      warmup: this.queryRunnerWarmupRounds,
      timestampsRecording: this.queryRunnerRecordTimestamps,
      logger: (message: string) => process.stderr.write(message),
      upQuery: this.queryRunnerUpQuery,
      additionalUrlParamsInit: new URLSearchParams(
        this.queryRunnerUrlParamsInit,
      ),
      additionalUrlParamsRun: new URLSearchParams(this.queryRunnerUrlParamsRun),
      timeout: this.queryTimeoutFallback,
    }).run({
      async onStart() {
        // Collect stats
        stopStats = await processHandler.startCollectingStats();

        // Breakpoint right before starting queries.
        if (context.breakpointBarrier) {
          await context.breakpointBarrier();
        }
      },
      async onStop() {
        stopStats();
      },
    });

    // Write results
    const resultsOutput = context.experimentPaths.output;
    if (!await fse.pathExists(resultsOutput)) {
      await fs.mkdir(resultsOutput);
    }
    context.logger.info(`Writing results to ${resultsOutput}\n`);
    await writeBenchmarkResults(
      results,
      Path.join(resultsOutput, 'query-times.csv'),
      this.queryRunnerRecordTimestamps,
      [ ...this.queryRunnerRecordHttpRequests ? [ 'httpRequests' ] : [] ],
    );

    // Close endpoint and server
    await closeProcess();
  }

  public async clean(
    context: ITaskContext,
    cleanTargets: ICleanTargets,
  ): Promise<void> {
    await this.hookSparqlEndpoint.clean(context, cleanTargets);
  }
}
