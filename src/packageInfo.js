import fs from 'fs';
import path from 'path';
import http from "http"
import workerFarm from 'worker-farm';
import pkgDir from 'pkg-dir';
import { debouncePromise, DebounceError } from './debouncePromise';
import { getPackageVersion, parseJson, isMUI } from './utils';

const workers = workerFarm(require.resolve('./webpack.js'), ['calcSize']);
const extensionVersion = parseJson(pkgDir.sync(__dirname)).version;
export const cacheFileName = path.join(__dirname, `ic-cache-${extensionVersion}`);
let sizeCache = {};
const versionsCache = {};
const failedSize = { size: 0, gzip: 0 };

function getMuiSize(path) {
  return new Promise((resolve, reject) => {
    http.get({
      host: 'g.alicdn.com',
      path: path
    }, function (response) {

      resolve({
        fileName: path,
        name: 'chai',
        size: response.headers['content-length'],
        gzip: response.headers['content-length'] / 1.6
      })
    });
  })
}

export async function getSize(pkg) {
  readSizeCache();
  if (isMUI(pkg.string)) {
    return await getMuiSize(pkg.string)
  } else {
    try {
      versionsCache[pkg.string] = versionsCache[pkg.string] || getPackageVersion(pkg);
    } catch (e) {
      return { ...pkg, ...failedSize };
    }
    const key = `${pkg.string}#${versionsCache[pkg.string]}`;
    if (sizeCache[key] === undefined || sizeCache[key] instanceof Promise) {
      try {
        sizeCache[key] = sizeCache[key] || calcPackageSize(pkg);
        sizeCache[key] = await sizeCache[key];
        saveSizeCache();
      } catch (e) {
        if (e === DebounceError) {
          delete sizeCache[key];
          throw e;
        } else {
          sizeCache[key] = failedSize;
          return { ...pkg, ...sizeCache[key], error: e };
        }
      }
    }
    return { ...pkg, ...sizeCache[key] };
  }
}

function calcPackageSize(packageInfo) {
  return debouncePromise(`${packageInfo.fileName}#${packageInfo.line}`, (resolve, reject) => {
    const debug = process.env.NODE_ENV === 'test';
    const calcSize = debug ? require('./webpack.js').calcSize : workers.calcSize;
    calcSize(
      packageInfo,
      result => (result.err ? reject(result.err) : resolve(result))
    );
  });
}

export function clearSizeCache() {
  sizeCache = {};
  if (fs.existsSync(cacheFileName)) {
    fs.unlinkSync(cacheFileName);
  }
}

function readSizeCache() {
  try {
    if (Object.keys(sizeCache).length === 0 && fs.existsSync(cacheFileName)) {
      sizeCache = JSON.parse(fs.readFileSync(cacheFileName, 'utf-8'));
    }
  } catch (e) {
    // silent error
  }
}

function saveSizeCache() {
  try {
    const keys = Object.keys(sizeCache).filter(key => {
      const size = sizeCache[key] && sizeCache[key].size;
      return typeof size === 'number' && size > 0;
    });
    const cache = keys.reduce((obj, key) => ({ ...obj, [key]: sizeCache[key] }), {});
    if (Object.keys(cache).length > 0) {
      fs.writeFileSync(cacheFileName, JSON.stringify(cache, null, 2), 'utf-8');
    }
  } catch (e) {
    // silent error
  }
}

export function cleanup() {
  workerFarm.end(workers);
}
