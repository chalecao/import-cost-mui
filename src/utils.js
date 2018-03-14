const fs = require('fs');
const path = require('path');
const pkgDir = require('pkg-dir');

export function parseJson(dir) {
  const pkg = path.join(dir, 'package.json');
  return JSON.parse(fs.readFileSync(pkg, 'utf-8'));
}

function getPackageName(pkg) {
  const pkgParts = pkg.name.split('/');
  let pkgName = pkgParts.shift();
  if (pkgName.startsWith('@')) {
    pkgName = path.join(pkgName, pkgParts.shift());
  }
  return pkgName;
}

function getPackageDirectory(pkg) {
  const modulesDirectory = path.join(pkgDir.sync(path.dirname(pkg.fileName)), 'node_modules');
  return path.join(modulesDirectory, getPackageName(pkg));
}

export function getPackageVersion(pkg) {
  return `${getPackageName(pkg)}@${getPackageJson(pkg).version}`;
}

export function getPackageJson(pkg) {
  return parseJson(getPackageDirectory(pkg));
}

export function isMUI(fileName){
  return fileName.match("/mui")
}

// module.exports = {getPackageJson, getPackageVersion, parseJson, isMUI};
