import * as Path from 'path';
import * as v8 from 'v8';
import * as fs from 'fs-extra';
import type {
  Experiment,
  Hook,
  ITaskContext,
  ICleanTargets,
  DockerContainerHandler,
  DockerNetworkHandler,
} from 'jbr';
import { ProcessHandlerComposite, secureProcessHandler } from 'jbr';
import { Generator } from 'solidbench/lib/Generator';
import {
  readQueries,
  SparqlBenchmarkRunner,
  writeBenchmarkResults,
} from 'sparql-benchmark-runner';

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
    // Validate memory limit
    const minimumMemory = 8192;
    // eslint-disable-next-line no-bitwise
    const currentMemory = v8.getHeapStatistics().heap_size_limit / 1024 / 1024;
    if (currentMemory < minimumMemory) {
      context.logger.warn(
        `SolidBench recommends allocating at least ${minimumMemory} MB of memory, while only ${currentMemory} was allocated.\nThis can be configured using Node's --max_old_space_size option.`,
      );
    }

    // Prepare hook
    await this.hookSparqlEndpoint.prepare(context, forceOverwriteGenerated);

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
      let dir = `${url.protocol}/${url.hostname}`;
      if (url.port) {
        dir += `_${url.port}`;
      }
      return [sbu, dir];
    }));

    const createdUserInfo = await populateServersFromDir({
      verbose: context.verbose,
      rootDir: Path.resolve(context.experimentPaths.generated, 'out-fragments'),
      urlToDirMap: urlToDirMap,
      authorization: this.serverAuthorization
    });
  }

  public async run(context: ITaskContext): Promise<void> {
    // Setup SPARQL endpoint
    const endpointProcessHandler = await this.hookSparqlEndpoint.start(
      context);

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
    if (!await fs.pathExists(resultsOutput)) {
      await fs.mkdir(resultsOutput);
    }
    context.logger.info(`Writing results to ${resultsOutput}\n`);
    await writeBenchmarkResults(
      results,
      Path.join(resultsOutput, 'query-times.csv'),
      this.queryRunnerRecordTimestamps,
      [...this.queryRunnerRecordHttpRequests ? ['httpRequests'] : []],
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
