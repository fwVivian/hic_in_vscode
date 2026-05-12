export interface HicViewerSnapshot {
  fileUri: string;
  fileName: string;
  genomeId?: string;
  locus?: string;
  normalization?: string;
  resolution?: number;
  colorScale?: string;
  stateString?: string;
  status?: string;
  resetRequested?: boolean;
  chromosomeCount?: number;
  resolutionCount?: number;
  normalizationCount?: number;
}

export interface HicViewerSettings {
  defaultNormalization: string;
  defaultResolution: number | null;
  enableLocalRangeServer: boolean;
  enableExternalTracks: boolean;
  maxCacheSizeMb: number;
  debugLogging: boolean;
}

export interface HicViewerBootstrap {
  file: {
    uri: string;
    url: string;
    name: string;
  };
  settings: HicViewerSettings;
  assets: {
    juiceboxModuleUri: string;
    juiceboxCssUri: string;
    viewScriptUri: string;
    viewStyleUri: string;
    fontAwesomeCssUri: string;
    codiconCssUri: string;
  };
}
