import * as d from '../../declarations';
import { isOutputTargetDocsCustom, isOutputTargetDocsJson, isOutputTargetDocsReadme } from '../output-targets/output-utils';


export function validateDocs(config: d.Config) {
  config.outputTargets = config.outputTargets || [];

  let buildDocs = !config.devMode;

  // json docs flag
  if (typeof config.flags.docsJson === 'string') {
    buildDocs = true;
    config.outputTargets.push({
      type: 'docs-json',
      file: config.flags.docsJson
    });
  }
  const jsonDocsOutputs = config.outputTargets.filter(isOutputTargetDocsJson);
  jsonDocsOutputs.forEach(jsonDocsOutput => {
    validateJsonDocsOutputTarget(config, jsonDocsOutput);
  });

  // readme docs flag
  if (config.flags.docs) {
    buildDocs = true;
    if (!config.outputTargets.some(o => o.type === 'docs')) {
      // didn't provide a docs config, so let's add one
      config.outputTargets.push({ type: 'docs' });
    }
  }
  const readmeDocsOutputs = config.outputTargets.filter(isOutputTargetDocsReadme);
  readmeDocsOutputs.forEach(readmeDocsOutput => {
    validateReadmeOutputTarget(config, readmeDocsOutput);
  });

  // custom docs
  const customDocsOutputs = config.outputTargets.filter(isOutputTargetDocsCustom);
  customDocsOutputs.forEach(jsonDocsOutput => {
    validateCustomDocsOutputTarget(jsonDocsOutput);
  });

  config.buildDocs = buildDocs;
}


function validateReadmeOutputTarget(config: d.Config, outputTarget: d.OutputTargetDocsReadme) {
  if (typeof outputTarget.dir !== 'string') {
    outputTarget.dir = config.srcDir;
  }

  if (!config.sys.path.isAbsolute(outputTarget.dir)) {
    outputTarget.dir = config.sys.path.join(config.rootDir, outputTarget.dir);
  }
  outputTarget.strict = !!outputTarget.strict;
}


function validateJsonDocsOutputTarget(config: d.Config, outputTarget: d.OutputTargetDocsJson) {
  if (typeof outputTarget.file !== 'string') {
    throw new Error(`docs-json outputTarget missing the "file" option`);
  }

  outputTarget.file = config.sys.path.join(config.rootDir, outputTarget.file);
  outputTarget.strict = !!outputTarget.strict;
}


function validateCustomDocsOutputTarget(outputTarget: d.OutputTargetDocsCustom) {
  if (typeof outputTarget.generator !== 'function') {
    throw new Error(`docs-custom outputTarget missing the "generator" function`);
  }

  outputTarget.strict = !!outputTarget.strict;
}