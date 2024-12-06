import * as semver from 'semver';

versions = ['1.2.1', '1.2.3', '1.2.5', '1.4.5', '2.0.0', '2.2.1', '2.2.3', '2.2.5', '2.4.5']

console.log(versions.filter((v) => semver.satisfies(v, '^2.2.0')));