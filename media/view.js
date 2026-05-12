const vscode = acquireVsCodeApi();
const bootstrap = window.__HIC_VIEW_BOOTSTRAP__;
const stateKey = bootstrap.file.uri;

const elements = {
  fileName: document.getElementById('file-name'),
  fileState: document.getElementById('file-state'),
  viewer: document.getElementById('viewer'),
  viewerShell: document.getElementById('viewer-shell'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingTitle: document.getElementById('loading-title'),
  loadingDetail: document.getElementById('loading-detail'),
  genomeId: document.getElementById('genome-id'),
  currentLocus: document.getElementById('current-locus'),
  binSize: document.getElementById('bin-size'),
  normalization: document.getElementById('normalization'),
  chromosomes: document.getElementById('chromosomes'),
  resolutions: document.getElementById('resolutions'),
  normalizations: document.getElementById('normalizations'),
  statusText: document.getElementById('status-text'),
  goReset: document.getElementById('go-reset'),
  goReload: document.getElementById('go-reload'),
  goCopyLocus: document.getElementById('go-copy-locus'),
  goCopyState: document.getElementById('go-copy-state'),
  goExternal: document.getElementById('go-external')
};

let browser;
let snapshotTimer = 0;
let resizeObserver;
let ignoreBeforeUnload = false;
const remembered = vscode.getState();

elements.fileName.textContent = bootstrap.file.name;
setStatus('Reading HIC metadata...');
vscode.postMessage({ type: 'ready' });

wireButtons();

main().catch((error) => {
  console.error(error);
  setErrorState('Renderer failed to load', error instanceof Error ? error.message : String(error));
});

async function main() {
  const module = await import(bootstrap.assets.juiceboxModuleUri);
  const juicebox = module.default ?? module;

  const viewerConfig = {
    url: bootstrap.file.url,
    name: bootstrap.file.name,
    showHicContactMapLabel: false,
    normalization: bootstrap.settings.defaultNormalization
  };

  if (remembered && remembered.resetRequested) {
    // Skip restored state once, then publish a fresh default snapshot after load.
  } else if (remembered && remembered.snapshot && remembered.snapshot.fileUri === stateKey && remembered.snapshot.stateString) {
    viewerConfig.state = remembered.snapshot.stateString;
  }

  const size = measureViewerSize();
  viewerConfig.width = size.width;
  viewerConfig.height = size.height;

  browser = await juicebox.init(elements.viewer, viewerConfig);
  observeResize();
  attachBrowserEvents();
  await applyDefaultResolution();
  updateMetadata();
  publishSnapshot('ready');
  setStatus('Ready');
  elements.loadingOverlay.style.display = 'none';
}

function wireButtons() {
  elements.goReset.addEventListener('click', () => {
    ignoreBeforeUnload = true;
    vscode.setState({ resetRequested: true });
    window.location.reload();
  });

  elements.goReload.addEventListener('click', () => {
    window.location.reload();
  });

  elements.goCopyLocus.addEventListener('click', () => {
    vscode.postMessage({ type: 'copy-locus' });
  });

  elements.goCopyState.addEventListener('click', () => {
    vscode.postMessage({ type: 'copy-state' });
  });

  elements.goExternal.addEventListener('click', () => {
    vscode.postMessage({ type: 'open-external' });
  });
}

function observeResize() {
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });
    resizeObserver.observe(elements.viewerShell);
  }
}

function attachBrowserEvents() {
  const push = () => scheduleSnapshot();
  const events = ['MapLoad', 'LocusChange', 'NormalizationChange', 'ColorScale', 'ControlMapLoad', 'NormVectorIndexLoad'];

  for (const eventType of events) {
    browser.eventBus.subscribe(eventType, () => {
      updateMetadata();
      push();
    });
  }

  window.addEventListener('focus', () => publishSnapshot('focus'));
  window.addEventListener('beforeunload', () => {
    if (ignoreBeforeUnload) {
      return;
    }
    const current = vscode.getState() ?? {};
    vscode.setState({
      ...current,
      snapshot: buildSnapshot()
    });
  });

  window.addEventListener('message', (event) => {
    if (event.data?.type === 'reload') {
      window.location.reload();
    }
    if (event.data?.type === 'reset') {
      ignoreBeforeUnload = true;
      vscode.setState({ resetRequested: true });
      window.location.reload();
    }
  });
}

async function applyDefaultResolution() {
  const target = bootstrap.settings.defaultResolution;
  if (target === null || target === undefined || !browser || !browser.dataset) {
    return;
  }

  const resolutions = browser.getResolutions();
  if (!resolutions.length) {
    return;
  }

  let zoomIndex = resolutions[0].index;
  for (let i = resolutions.length - 1; i >= 0; i -= 1) {
    if (resolutions[i].binSize >= target) {
      zoomIndex = resolutions[i].index;
      break;
    }
  }

  await browser.setZoom(zoomIndex);
}

function scheduleSnapshot() {
  if (snapshotTimer) {
    window.clearTimeout(snapshotTimer);
  }
  snapshotTimer = window.setTimeout(() => publishSnapshot('update'), 80);
}

function publishSnapshot(status) {
  const snapshot = buildSnapshot();
  if (!snapshot) {
    return;
  }

  const current = vscode.getState() ?? {};
  vscode.setState({
    ...current,
    snapshot
  });
  vscode.postMessage({ type: 'state', snapshot });
}

function buildSnapshot() {
  if (!browser || !browser.dataset || !browser.state) {
    return null;
  }

  const locus = currentLocus(browser);
  const resolution = browser.dataset.bpResolutions?.[browser.state.zoom];
  const colorScale = browser.getColorScale()?.stringify?.();
  const snapshot = {
    fileUri: bootstrap.file.uri,
    fileName: bootstrap.file.name,
    genomeId: browser.genome?.id ?? browser.dataset.genomeId,
    locus,
    normalization: browser.state.normalization,
    resolution,
    colorScale,
    stateString: browser.state.stringify?.(),
    chromosomeCount: browser.dataset.chromosomes?.length ?? 0,
    resolutionCount: browser.dataset.bpResolutions?.length ?? 0
  };

  return snapshot;
}

function updateMetadata() {
  if (!browser || !browser.dataset) {
    return;
  }

  const dataset = browser.dataset;
  const locus = currentLocus(browser);
  const resolution = browser.dataset.bpResolutions?.[browser.state?.zoom];

  elements.genomeId.textContent = browser.genome?.id ?? dataset.genomeId ?? '-';
  elements.currentLocus.textContent = locus || '-';
  elements.binSize.textContent = resolution ? formatResolution(resolution) : '-';
  elements.normalization.textContent = browser.state?.normalization ?? '-';
  elements.fileState.textContent = `${dataset.chromosomes?.length ?? 0} chromosomes, ${dataset.bpResolutions?.length ?? 0} resolutions`;

  renderChromosomes(dataset.chromosomes ?? []);
  renderResolutions(dataset.bpResolutions ?? []);
  void renderNormalizations();
}

function renderChromosomes(chromosomes) {
  const list = document.createElement('ul');
  list.className = 'compact-list';
  for (const chr of chromosomes) {
    const item = document.createElement('li');
    item.textContent = `${chr.name} (${formatNumber(chr.size)} bp)`;
    list.appendChild(item);
  }
  replaceContent(elements.chromosomes, list);
}

async function renderNormalizations() {
  if (!browser || typeof browser.getNormalizationOptions !== 'function') {
    replaceContent(elements.normalizations, textBlock(['NONE']));
    return;
  }

  const listValues = await browser.getNormalizationOptions();
  if (!listValues || !listValues.length) {
    replaceContent(elements.normalizations, textBlock(['NONE']));
    return;
  }

  replaceContent(elements.normalizations, textBlock(listValues));
}

function renderResolutions(resolutions) {
  const list = document.createElement('ul');
  list.className = 'compact-list';
  for (const resolution of resolutions) {
    const item = document.createElement('li');
    item.textContent = formatResolution(resolution);
    list.appendChild(item);
  }
  replaceContent(elements.resolutions, list);
}

function textBlock(values) {
  const wrapper = document.createElement('div');
  wrapper.textContent = values.join(', ');
  return wrapper;
}

function replaceContent(element, content) {
  element.replaceChildren(content);
}

function setStatus(message, detail = '') {
  elements.statusText.textContent = detail ? `${message} ${detail}` : message;
  elements.loadingTitle.textContent = message;
  elements.loadingDetail.textContent = detail;
}

function setErrorState(title, detail) {
  elements.loadingOverlay.style.display = 'flex';
  elements.loadingTitle.textContent = title;
  elements.loadingDetail.textContent = detail;
  elements.statusText.textContent = title;
  elements.fileState.textContent = detail;
}

function currentLocus(viewer) {
  if (!viewer.dataset || !viewer.state) {
    return '';
  }

  if (viewer.dataset.isWholeGenome && viewer.dataset.isWholeGenome(viewer.state.chr1)) {
    return 'All';
  }

  const chromosomes = viewer.dataset.chromosomes;
  const chr1 = chromosomes?.[viewer.state.chr1];
  const chr2 = chromosomes?.[viewer.state.chr2];
  if (!chr1 || !chr2) {
    return '';
  }

  const binSize = viewer.dataset.bpResolutions?.[viewer.state.zoom];
  if (!binSize) {
    return '';
  }

  const dimensions = viewer.contactMatrixView.getViewDimensions();
  const startX = 1 + Math.round(viewer.state.x * binSize);
  const startY = 1 + Math.round(viewer.state.y * binSize);
  const endX = Math.min(chr1.size, Math.round((dimensions.width / viewer.state.pixelSize) * binSize) + startX - 1);
  const endY = Math.min(chr2.size, Math.round((dimensions.height / viewer.state.pixelSize) * binSize) + startY - 1);

  return `${chr1.name}:${formatNumber(startX)}-${formatNumber(endX)} ${chr2.name}:${formatNumber(startY)}-${formatNumber(endY)}`;
}

function formatResolution(bp) {
  if (bp >= 1_000_000) {
    return `${formatNumber(bp / 1_000_000)} Mb`;
  }
  if (bp >= 1_000) {
    return `${formatNumber(bp / 1_000)} kb`;
  }
  return `${formatNumber(bp)} bp`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function measureViewerSize() {
  const rect = elements.viewerShell.getBoundingClientRect();
  return {
    width: Math.max(640, Math.floor(rect.width)),
    height: Math.max(520, Math.floor(rect.height))
  };
}
