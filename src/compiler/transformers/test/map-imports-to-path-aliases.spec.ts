import type { OutputTargetDistCollection } from '@stencil/core/declarations';
import { mockValidatedConfig } from '@stencil/core/testing';
import { Extension } from 'typescript';
import * as ts from 'typescript';

import { ValidatedConfig } from '../../../internal';
import { mapImportsToPathAliases } from '../map-imports-to-path-aliases';
import { transpileModule } from './transpile';

let resolveModuleNameSpy: jest.Mock<ReturnType<typeof ts.resolveModuleName>, Parameters<typeof ts.resolveModuleName>>;

// we need to mock typescript instead of being able to spy on
// `resolveModuleName` because as of TS 5.0 the default export is an object
// where methods are set on it using `Object.defineProperty` but they are
// _not_ configurable. This means that `jest.spyOn` can't overwrite them with
// a spy function!
jest.mock('typescript', () => {
  const original = jest.requireActual('typescript');
  return {
    ...original,
    resolveModuleName: jest.fn((moduleName, containingFile, compilerOptions, moduleResolutionHost) => {
      return resolveModuleNameSpy(moduleName, containingFile, compilerOptions, moduleResolutionHost);
    }),
  };
});

describe('mapImportsToPathAliases', () => {
  let module: ReturnType<typeof transpileModule>;
  let config: ValidatedConfig;
  let outputTarget: OutputTargetDistCollection;

  beforeEach(() => {
    config = mockValidatedConfig({ tsCompilerOptions: {} });

    resolveModuleNameSpy = jest.fn();

    outputTarget = {
      type: 'dist-collection',
      dir: 'dist',
      collectionDir: 'dist/collection',
      transformAliasedImportPaths: true,
    };
  });

  afterEach(() => {
    resolveModuleNameSpy.mockReset();
  });

  it.only('does nothing if the config flag is `false`', () => {
    outputTarget.transformAliasedImportPaths = false;
    resolveModuleNameSpy.mockReturnValue({
      resolvedModule: {
        isExternalLibraryImport: false,
        extension: Extension.Ts,
        resolvedFileName: 'utils.js',
      },
    });
    const inputText = `
        import { utils } from "@utils/utils";

        utils.test();
    `;

    module = transpileModule(inputText, config, null, [], [mapImportsToPathAliases(config, '', outputTarget)]);

    expect(module.outputText).toContain('import { utils } from "@utils/utils";');
  });

  it('ignores relative imports', () => {
    resolveModuleNameSpy.mockReturnValue({
      resolvedModule: {
        isExternalLibraryImport: false,
        extension: Extension.Ts,
        resolvedFileName: 'utils.js',
      },
    });
    const inputText = `
        import * as dateUtils from "../utils";

        dateUtils.test();
    `;

    module = transpileModule(inputText, config, null, [], [mapImportsToPathAliases(config, '', outputTarget)]);

    expect(module.outputText).toContain('import * as dateUtils from "../utils";');
  });

  it('ignores external imports', () => {
    resolveModuleNameSpy.mockReturnValue({
      resolvedModule: {
        isExternalLibraryImport: true,
        extension: Extension.Ts,
        resolvedFileName: 'utils.js',
      },
    });
    const inputText = `
        import { utils } from "@stencil/core";

        utils.test();
    `;

    module = transpileModule(inputText, config, null, [], [mapImportsToPathAliases(config, '', outputTarget)]);

    expect(module.outputText).toContain('import { utils } from "@stencil/core";');
  });

  it('does nothing if there is no resolved module', () => {
    resolveModuleNameSpy.mockReturnValue({
      resolvedModule: undefined,
    });
    const inputText = `
        import { utils } from "@utils";

        utils.test();
    `;

    module = transpileModule(inputText, config, null, [], [mapImportsToPathAliases(config, '', outputTarget)]);

    expect(module.outputText).toContain('import { utils } from "@utils";');
  });

  // TODO(STENCIL-223): remove spy to test actual resolution behavior
  it('replaces the path alias with the generated relative path', () => {
    resolveModuleNameSpy.mockReturnValue({
      resolvedModule: {
        isExternalLibraryImport: false,
        extension: Extension.Ts,
        resolvedFileName: 'utils.ts',
      },
    });
    const inputText = `
        import { utils } from "@utils";

        utils.test();
    `;

    module = transpileModule(inputText, config, null, [], [mapImportsToPathAliases(config, '', outputTarget)]);

    expect(module.outputText).toContain('import { utils } from "utils";');
  });

  // The resolved module is not part of the output directory
  it('generates the correct relative path when the resolved module is outside the transpiled project', () => {
    config.srcDir = '/test-dir';
    resolveModuleNameSpy.mockReturnValue({
      resolvedModule: {
        isExternalLibraryImport: false,
        extension: Extension.Ts,
        resolvedFileName: '/some-compiled-dir/utils/utils.ts',
      },
    });
    const inputText = `
        import { utils } from "@utils";

        utils.test();
    `;

    module = transpileModule(
      inputText,
      config,
      null,
      [],
      [mapImportsToPathAliases(config, '/dist/collection/test.js', outputTarget)]
    );

    expect(module.outputText).toContain(`import { utils } from "../../some-compiled-dir/utils/utils";`);
  });

  // Source module and resolved module are in the same output directory
  it('generates the correct relative path when the resolved module is within the transpiled project', () => {
    config.srcDir = '/test-dir';
    resolveModuleNameSpy.mockReturnValue({
      resolvedModule: {
        isExternalLibraryImport: false,
        extension: Extension.Ts,
        resolvedFileName: '/test-dir/utils/utils.ts',
      },
    });
    const inputText = `
        import { utils } from "@utils";

        utils.test();
    `;

    module = transpileModule(
      inputText,
      config,
      null,
      [],
      [mapImportsToPathAliases(config, 'dist/collection/test.js', outputTarget)]
    );

    expect(module.outputText).toContain(`import { utils } from "./utils/utils";`);
  });
});
