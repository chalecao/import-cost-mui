import { getSize, cleanup as kill } from './packageInfo';
import { getPackages, TYPESCRIPT as TYPESCRIPT_LANG, JAVASCRIPT as JAVASCRIPT_LANG } from './parser';
import { EventEmitter } from 'events';
import { getPackageVersion, parseJson, parseSeedJson, isMUI } from './utils';
import pkgDir from 'pkg-dir';

export const TYPESCRIPT = TYPESCRIPT_LANG;
export const JAVASCRIPT = JAVASCRIPT_LANG;

export function cleanup() {
  kill();
}

export function importCost(fileName, text, language) {
  const emitter = new EventEmitter();
  setTimeout(async () => {
    let uitype = parseJson(pkgDir.sync(fileName))["uitype"] || "mui,tm";
    let _type
    try {
      const imports = getPackages(fileName, text, language)
        .filter(packageInfo => (!!isMUI(packageInfo.name, uitype)) && packageInfo.name && !packageInfo.name.startsWith('.'));

      emitter.emit('start', imports);


      const promises = imports
        .map(packageInfo => {
          _type = isMUI(packageInfo.name, uitype)
          // console.log(uitype)
          if (_type) {
            return getSize({ "string": packageInfo.name, "fileName": fileName, "line": packageInfo.line, "uitype": _type })
          } else if (uitype.indexOf("others")) {
            return getSize(packageInfo)
          } else {
            return {}
          }
        })
        .map(promise =>
          promise.then(packageInfo => {
            emitter.emit('calculated', packageInfo);
            return packageInfo;
          })
        );
      const packages = (await Promise.all(promises)).filter(x => x);
      emitter.emit('done', packages);
    } catch (e) {
      emitter.emit('error', e);
    }
  }, 0);
  return emitter;
}
