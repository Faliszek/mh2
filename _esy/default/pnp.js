#!/usr/bin/env node
/* eslint-disable max-len, flowtype/require-valid-file-annotation, flowtype/require-return-type */
/* global packageInformationStores, $$BLACKLIST, $$SETUP_STATIC_TABLES */

// Used for the resolveUnqualified part of the resolution (ie resolving folder/index.js & file extensions)
// Deconstructed so that they aren't affected by any fs monkeypatching occuring later during the execution
const {statSync, lstatSync, readlinkSync, readFileSync, existsSync, realpathSync} = require('fs');

const Module = require('module');
const path = require('path');
const StringDecoder = require('string_decoder');

const $$BLACKLIST = null;
const ignorePattern = $$BLACKLIST ? new RegExp($$BLACKLIST) : null;

const builtinModules = new Set(Module.builtinModules || Object.keys(process.binding('natives')));

const topLevelLocator = {name: null, reference: null};
const blacklistedLocator = {name: NaN, reference: NaN};

// Used for compatibility purposes - cf setupCompatibilityLayer
const patchedModules = new Map();
const fallbackLocators = [topLevelLocator];

// Matches backslashes of Windows paths
const backwardSlashRegExp = /\\/g;

// Matches if the path must point to a directory (ie ends with /)
const isDirRegExp = /\/$/;

// Matches if the path starts with a valid path qualifier (./, ../, /)
// eslint-disable-next-line no-unused-vars
const isStrictRegExp = /^\.{0,2}/;

// Splits a require request into its components, or return null if the request is a file path
const pathRegExp = /^(?![A-Za-z]:)(?!\.{0,2}(?:\/|$))((?:@[^\/]+\/)?[^\/]+)\/?(.*|)$/;

// Keep a reference around ("module" is a common name in this context, so better rename it to something more significant)
const pnpModule = module;

/**
 * Used to disable the resolution hooks (for when we want to fallback to the previous resolution - we then need
 * a way to "reset" the environment temporarily)
 */

let enableNativeHooks = true;

/**
 * Simple helper function that assign an error code to an error, so that it can more easily be caught and used
 * by third-parties.
 */

function makeError(code, message, data = {}) {
  const error = new Error(message);
  return Object.assign(error, {code, data});
}

/**
 * Ensures that the returned locator isn't a blacklisted one.
 *
 * Blacklisted packages are packages that cannot be used because their dependencies cannot be deduced. This only
 * happens with peer dependencies, which effectively have different sets of dependencies depending on their parents.
 *
 * In order to deambiguate those different sets of dependencies, the Yarn implementation of PnP will generate a
 * symlink for each combination of <package name>/<package version>/<dependent package> it will find, and will
 * blacklist the target of those symlinks. By doing this, we ensure that files loaded through a specific path
 * will always have the same set of dependencies, provided the symlinks are correctly preserved.
 *
 * Unfortunately, some tools do not preserve them, and when it happens PnP isn't able anymore to deduce the set of
 * dependencies based on the path of the file that makes the require calls. But since we've blacklisted those paths,
 * we're able to print a more helpful error message that points out that a third-party package is doing something
 * incompatible!
 */

// eslint-disable-next-line no-unused-vars
function blacklistCheck(locator) {
  if (locator === blacklistedLocator) {
    throw makeError(
      `BLACKLISTED`,
      [
        `A package has been resolved through a blacklisted path - this is usually caused by one of your tools calling`,
        `"realpath" on the return value of "require.resolve". Since the returned values use symlinks to disambiguate`,
        `peer dependencies, they must be passed untransformed to "require".`,
      ].join(` `),
    );
  }

  return locator;
}

let packageInformationStores = new Map([
["@esy-ocaml/reason",
new Map([["3.4.0",
         {
           packageLocation: "/Users/pawelfalisz/.esy/source/i/esy_ocaml__s__reason__3.4.0__d55f0cf4/",
           packageDependencies: new Map([["@esy-ocaml/reason", "3.4.0"],
                                           ["@opam/dune", "opam:1.10.0"],
                                           ["@opam/menhir", "opam:20190613"],
                                           ["@opam/merlin-extend",
                                           "opam:0.3"],
                                           ["@opam/ocaml-migrate-parsetree",
                                           "opam:1.3.1"],
                                           ["@opam/ocamlfind", "opam:1.8.0"],
                                           ["@opam/result", "opam:1.4"],
                                           ["ocaml", "4.7.1004"]])}]])],
  ["@esy-ocaml/substs",
  new Map([["0.0.1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/esy_ocaml__s__substs__0.0.1__19de1ee1/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"]])}]])],
  ["@opam/astring",
  new Map([["opam:0.8.3",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__astring__opam__c__0.8.3__3d7df80e/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/astring", "opam:0.8.3"],
                                             ["@opam/base-bytes",
                                             "opam:base"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/topkg", "opam:1.0.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/base",
  new Map([["opam:v0.12.2",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__base__opam__c__v0.12.2__910d5f6b/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base", "opam:v0.12.2"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/sexplib0",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/base-bigarray",
  new Map([["opam:base",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__base_bigarray__opam__c__base__37a71828/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-bigarray",
                                             "opam:base"]])}]])],
  ["@opam/base-bytes",
  new Map([["opam:base",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__base_bytes__opam__c__base__48b6019a/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-bytes",
                                             "opam:base"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/base-threads",
  new Map([["opam:base",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__base_threads__opam__c__base__f282958b/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-threads",
                                             "opam:base"]])}]])],
  ["@opam/base-unix",
  new Map([["opam:base",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__base_unix__opam__c__base__93427a57/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-unix", "opam:base"]])}]])],
  ["@opam/base64",
  new Map([["opam:3.2.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__base64__opam__c__3.2.0__6d458a0f/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-bytes",
                                             "opam:base"],
                                             ["@opam/base64", "opam:3.2.0"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/biniou",
  new Map([["opam:1.2.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__biniou__opam__c__1.2.0__7c0af8cd/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/biniou", "opam:1.2.0"],
                                             ["@opam/conf-which", "opam:1"],
                                             ["@opam/easy-format",
                                             "opam:1.3.1"],
                                             ["@opam/jbuilder",
                                             "opam:transition"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/cmdliner",
  new Map([["opam:1.0.4",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__cmdliner__opam__c__1.0.4__11482f41/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/cmdliner", "opam:1.0.4"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/cohttp",
  new Map([["opam:2.1.2",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__cohttp__opam__c__2.1.2__899b7a60/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base64", "opam:3.2.0"],
                                             ["@opam/cohttp", "opam:2.1.2"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/fieldslib",
                                             "opam:v0.12.0"],
                                             ["@opam/jsonm", "opam:1.0.1"],
                                             ["@opam/ppx_fields_conv",
                                             "opam:v0.12.0"],
                                             ["@opam/ppx_sexp_conv",
                                             "opam:v0.12.0"],
                                             ["@opam/re", "opam:1.9.0"],
                                             ["@opam/sexplib0",
                                             "opam:v0.12.0"],
                                             ["@opam/stringext",
                                             "opam:1.6.0"],
                                             ["@opam/uri", "opam:2.2.1"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/cohttp-lwt",
  new Map([["opam:2.0.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__cohttp_lwt__opam__c__2.0.0__8ca82450/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/cohttp", "opam:2.1.2"],
                                             ["@opam/cohttp-lwt",
                                             "opam:2.0.0"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/logs", "opam:0.6.3"],
                                             ["@opam/lwt", "opam:4.1.0"],
                                             ["@opam/ppx_sexp_conv",
                                             "opam:v0.12.0"],
                                             ["@opam/sexplib0",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/cohttp-lwt-unix",
  new Map([["opam:2.0.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__cohttp_lwt_unix__opam__c__2.0.0__a6d7d14d/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-unix", "opam:base"],
                                             ["@opam/cmdliner", "opam:1.0.4"],
                                             ["@opam/cohttp-lwt",
                                             "opam:2.0.0"],
                                             ["@opam/cohttp-lwt-unix",
                                             "opam:2.0.0"],
                                             ["@opam/conduit-lwt-unix",
                                             "opam:1.4.0"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/fmt", "opam:0.8.6"],
                                             ["@opam/logs", "opam:0.6.3"],
                                             ["@opam/lwt", "opam:4.1.0"],
                                             ["@opam/magic-mime",
                                             "opam:1.1.1"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/conduit",
  new Map([["opam:1.4.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__conduit__opam__c__1.4.0__09ce1a40/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/astring", "opam:0.8.3"],
                                             ["@opam/conduit", "opam:1.4.0"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/ipaddr", "opam:3.1.0"],
                                             ["@opam/logs", "opam:0.6.3"],
                                             ["@opam/ppx_sexp_conv",
                                             "opam:v0.12.0"],
                                             ["@opam/result", "opam:1.4"],
                                             ["@opam/sexplib",
                                             "opam:v0.12.0"],
                                             ["@opam/uri", "opam:2.2.1"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/conduit-lwt",
  new Map([["opam:1.4.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__conduit_lwt__opam__c__1.4.0__238a923e/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-unix", "opam:base"],
                                             ["@opam/conduit", "opam:1.4.0"],
                                             ["@opam/conduit-lwt",
                                             "opam:1.4.0"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/lwt", "opam:4.1.0"],
                                             ["@opam/ppx_sexp_conv",
                                             "opam:v0.12.0"],
                                             ["@opam/sexplib",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/conduit-lwt-unix",
  new Map([["opam:1.4.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__conduit_lwt_unix__opam__c__1.4.0__8a9a0f04/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-unix", "opam:base"],
                                             ["@opam/conduit-lwt",
                                             "opam:1.4.0"],
                                             ["@opam/conduit-lwt-unix",
                                             "opam:1.4.0"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/ipaddr", "opam:3.1.0"],
                                             ["@opam/lwt", "opam:4.1.0"],
                                             ["@opam/ppx_sexp_conv",
                                             "opam:v0.12.0"],
                                             ["@opam/uri", "opam:2.2.1"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/conf-m4",
  new Map([["opam:1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__conf_m4__opam__c__1__2502196a/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/conf-m4", "opam:1"]])}]])],
  ["@opam/conf-which",
  new Map([["opam:1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__conf_which__opam__c__1__cafac9ea/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/conf-which", "opam:1"]])}]])],
  ["@opam/cppo",
  new Map([["opam:1.6.6",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__cppo__opam__c__1.6.6__2223b9cb/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-unix", "opam:base"],
                                             ["@opam/cppo", "opam:1.6.6"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/crunch",
  new Map([["opam:3.0.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__crunch__opam__c__3.0.0__20d82e87/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/cmdliner", "opam:1.0.4"],
                                             ["@opam/crunch", "opam:3.0.0"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/ptime", "opam:0.8.5"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/digestif",
  new Map([["opam:0.7.2",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__digestif__opam__c__0.7.2__4eb458ae/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-bigarray",
                                             "opam:base"],
                                             ["@opam/base-bytes",
                                             "opam:base"],
                                             ["@opam/digestif", "opam:0.7.2"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/eqaf", "opam:0.4"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/dune",
  new Map([["opam:1.10.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__dune__opam__c__1.10.0__6e365125/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-threads",
                                             "opam:base"],
                                             ["@opam/base-unix", "opam:base"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/easy-format",
  new Map([["opam:1.3.1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__easy_format__opam__c__1.3.1__09dd6fc0/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/easy-format",
                                             "opam:1.3.1"],
                                             ["@opam/jbuilder",
                                             "opam:transition"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/eqaf",
  new Map([["opam:0.4",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__eqaf__opam__c__0.4__237234d3/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/eqaf", "opam:0.4"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/fieldslib",
  new Map([["opam:v0.12.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__fieldslib__opam__c__v0.12.0__0c19c421/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base", "opam:v0.12.2"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/fieldslib",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/fmt",
  new Map([["opam:0.8.6",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__fmt__opam__c__0.8.6__2908bed3/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-unix", "opam:base"],
                                             ["@opam/cmdliner", "opam:1.0.4"],
                                             ["@opam/fmt", "opam:0.8.6"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/seq", "opam:base"],
                                             ["@opam/stdlib-shims",
                                             "opam:0.1.0"],
                                             ["@opam/topkg", "opam:1.0.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/graphql",
  new Map([["opam:0.9.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__graphql__opam__c__0.9.0__bafa9d88/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/graphql", "opam:0.9.0"],
                                             ["@opam/graphql_parser",
                                             "opam:0.12.2"],
                                             ["@opam/rresult", "opam:0.6.0"],
                                             ["@opam/seq", "opam:base"],
                                             ["@opam/yojson", "opam:1.7.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/graphql-cohttp",
  new Map([["opam:0.12.1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__graphql_cohttp__opam__c__0.12.1__fa96e479/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/astring", "opam:0.8.3"],
                                             ["@opam/base64", "opam:3.2.0"],
                                             ["@opam/cohttp", "opam:2.1.2"],
                                             ["@opam/crunch", "opam:3.0.0"],
                                             ["@opam/digestif", "opam:0.7.2"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/graphql", "opam:0.9.0"],
                                             ["@opam/graphql-cohttp",
                                             "opam:0.12.1"],
                                             ["@opam/ocplib-endian",
                                             "opam:1.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/graphql-lwt",
  new Map([["opam:0.9.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__graphql_lwt__opam__c__0.9.0__39c8a947/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/graphql", "opam:0.9.0"],
                                             ["@opam/graphql-lwt",
                                             "opam:0.9.0"],
                                             ["@opam/lwt", "opam:4.1.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/graphql_parser",
  new Map([["opam:0.12.2",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__graphql__parser__opam__c__0.12.2__e4e7efba/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/fmt", "opam:0.8.6"],
                                             ["@opam/graphql_parser",
                                             "opam:0.12.2"],
                                             ["@opam/menhir",
                                             "opam:20190613"],
                                             ["@opam/re", "opam:1.9.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ipaddr",
  new Map([["opam:3.1.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ipaddr__opam__c__3.1.0__caa99f2a/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/ipaddr", "opam:3.1.0"],
                                             ["@opam/macaddr", "opam:3.1.0"],
                                             ["@opam/sexplib0",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/jbuilder",
  new Map([["opam:transition",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__jbuilder__opam__c__transition__c94246e9/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/jbuilder",
                                             "opam:transition"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/jsonm",
  new Map([["opam:1.0.1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__jsonm__opam__c__1.0.1__0f41f896/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/jsonm", "opam:1.0.1"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/topkg", "opam:1.0.0"],
                                             ["@opam/uchar", "opam:0.0.2"],
                                             ["@opam/uutf", "opam:1.0.2"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/logs",
  new Map([["opam:0.6.3",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__logs__opam__c__0.6.3__f0f55b48/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/cmdliner", "opam:1.0.4"],
                                             ["@opam/fmt", "opam:0.8.6"],
                                             ["@opam/logs", "opam:0.6.3"],
                                             ["@opam/lwt", "opam:4.1.0"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/topkg", "opam:1.0.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/lwt",
  new Map([["opam:4.1.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__lwt__opam__c__4.1.0__34eb24ea/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-threads",
                                             "opam:base"],
                                             ["@opam/base-unix", "opam:base"],
                                             ["@opam/cppo", "opam:1.6.6"],
                                             ["@opam/jbuilder",
                                             "opam:transition"],
                                             ["@opam/lwt", "opam:4.1.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/result", "opam:1.4"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/macaddr",
  new Map([["opam:3.1.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__macaddr__opam__c__3.1.0__2640b85c/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/macaddr", "opam:3.1.0"],
                                             ["@opam/sexplib0",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/magic-mime",
  new Map([["opam:1.1.1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__magic_mime__opam__c__1.1.1__de34e232/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/magic-mime",
                                             "opam:1.1.1"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/menhir",
  new Map([["opam:20190613",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__menhir__opam__c__20190613__1111972f/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/menhir",
                                             "opam:20190613"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/merlin",
  new Map([["opam:3.3.1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__merlin__opam__c__3.3.1__17daace2/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/merlin", "opam:3.3.1"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/yojson", "opam:1.7.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/merlin-extend",
  new Map([["opam:0.3",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__merlin_extend__opam__c__0.3__6711ef24/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/cppo", "opam:1.6.6"],
                                             ["@opam/merlin-extend",
                                             "opam:0.3"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/num",
  new Map([["opam:1.1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__num__opam__c__1.1__28057132/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/num", "opam:1.1"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ocaml-compiler-libs",
  new Map([["opam:v0.12.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ocaml_compiler_libs__opam__c__v0.12.0__fc7eef4e/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/ocaml-compiler-libs",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ocaml-migrate-parsetree",
  new Map([["opam:1.3.1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ocaml_migrate_parsetree__opam__c__1.3.1__2b496e3b/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/ocaml-migrate-parsetree",
                                             "opam:1.3.1"],
                                             ["@opam/ppx_derivers",
                                             "opam:1.2.1"],
                                             ["@opam/result", "opam:1.4"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ocamlbuild",
  new Map([["opam:0.14.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ocamlbuild__opam__c__0.14.0__56d4d3d9/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ocamlfind",
  new Map([["opam:1.8.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ocamlfind__opam__c__1.8.0__6ce51c9c/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/conf-m4", "opam:1"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ocplib-endian",
  new Map([["opam:1.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ocplib_endian__opam__c__1.0__aceff5fc/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-bytes",
                                             "opam:base"],
                                             ["@opam/cppo", "opam:1.6.6"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/ocplib-endian",
                                             "opam:1.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/parsexp",
  new Map([["opam:v0.12.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__parsexp__opam__c__v0.12.0__fe8566da/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base", "opam:v0.12.2"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/parsexp",
                                             "opam:v0.12.0"],
                                             ["@opam/sexplib0",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ppx_derivers",
  new Map([["opam:1.2.1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ppx__derivers__opam__c__1.2.1__88e907fb/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/ppx_derivers",
                                             "opam:1.2.1"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ppx_fields_conv",
  new Map([["opam:v0.12.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ppx__fields__conv__opam__c__v0.12.0__29747c70/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base", "opam:v0.12.2"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/fieldslib",
                                             "opam:v0.12.0"],
                                             ["@opam/ppx_fields_conv",
                                             "opam:v0.12.0"],
                                             ["@opam/ppxlib", "opam:0.8.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ppx_sexp_conv",
  new Map([["opam:v0.12.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ppx__sexp__conv__opam__c__v0.12.0__0637baeb/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base", "opam:v0.12.2"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/ppx_sexp_conv",
                                             "opam:v0.12.0"],
                                             ["@opam/ppxlib", "opam:0.8.0"],
                                             ["@opam/sexplib0",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ppxlib",
  new Map([["opam:0.8.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ppxlib__opam__c__0.8.0__2845cbb6/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base", "opam:v0.12.2"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/ocaml-compiler-libs",
                                             "opam:v0.12.0"],
                                             ["@opam/ocaml-migrate-parsetree",
                                             "opam:1.3.1"],
                                             ["@opam/ppx_derivers",
                                             "opam:1.2.1"],
                                             ["@opam/ppxlib", "opam:0.8.0"],
                                             ["@opam/stdio", "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/ptime",
  new Map([["opam:0.8.5",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__ptime__opam__c__0.8.5__79d19c69/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/ptime", "opam:0.8.5"],
                                             ["@opam/result", "opam:1.4"],
                                             ["@opam/topkg", "opam:1.0.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/re",
  new Map([["opam:1.9.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__re__opam__c__1.9.0__22ec4eb0/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/re", "opam:1.9.0"],
                                             ["@opam/seq", "opam:base"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/result",
  new Map([["opam:1.4",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__result__opam__c__1.4__606c4200/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/result", "opam:1.4"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/rresult",
  new Map([["opam:0.6.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__rresult__opam__c__0.6.0__108d9e8f/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/result", "opam:1.4"],
                                             ["@opam/rresult", "opam:0.6.0"],
                                             ["@opam/topkg", "opam:1.0.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/seq",
  new Map([["opam:base",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__seq__opam__c__base__a0c677b1/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/seq", "opam:base"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/sexplib",
  new Map([["opam:v0.12.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__sexplib__opam__c__v0.12.0__0d691701/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/num", "opam:1.1"],
                                             ["@opam/parsexp",
                                             "opam:v0.12.0"],
                                             ["@opam/sexplib",
                                             "opam:v0.12.0"],
                                             ["@opam/sexplib0",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/sexplib0",
  new Map([["opam:v0.12.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__sexplib0__opam__c__v0.12.0__e49036be/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/sexplib0",
                                             "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/stdio",
  new Map([["opam:v0.12.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__stdio__opam__c__v0.12.0__81114f79/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base", "opam:v0.12.2"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/stdio", "opam:v0.12.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/stdlib-shims",
  new Map([["opam:0.1.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__stdlib_shims__opam__c__0.1.0__610b6088/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/stdlib-shims",
                                             "opam:0.1.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/stringext",
  new Map([["opam:1.6.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__stringext__opam__c__1.6.0__fd42d57c/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/base-bytes",
                                             "opam:base"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/stringext",
                                             "opam:1.6.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/topkg",
  new Map([["opam:1.0.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__topkg__opam__c__1.0.0__1e0a2ad6/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/result", "opam:1.4"],
                                             ["@opam/topkg", "opam:1.0.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/uchar",
  new Map([["opam:0.0.2",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__uchar__opam__c__0.0.2__d1ad73a0/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/uchar", "opam:0.0.2"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/uri",
  new Map([["opam:2.2.1",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__uri__opam__c__2.2.1__ec78d7e2/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/ppx_sexp_conv",
                                             "opam:v0.12.0"],
                                             ["@opam/re", "opam:1.9.0"],
                                             ["@opam/sexplib0",
                                             "opam:v0.12.0"],
                                             ["@opam/stringext",
                                             "opam:1.6.0"],
                                             ["@opam/uri", "opam:2.2.1"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/uutf",
  new Map([["opam:1.0.2",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__uutf__opam__c__1.0.2__34474f09/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/cmdliner", "opam:1.0.4"],
                                             ["@opam/ocamlbuild",
                                             "opam:0.14.0"],
                                             ["@opam/ocamlfind",
                                             "opam:1.8.0"],
                                             ["@opam/topkg", "opam:1.0.0"],
                                             ["@opam/uchar", "opam:0.0.2"],
                                             ["@opam/uutf", "opam:1.0.2"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["@opam/yojson",
  new Map([["opam:1.7.0",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/opam__s__yojson__opam__c__1.7.0__25fa13aa/",
             packageDependencies: new Map([["@esy-ocaml/substs", "0.0.1"],
                                             ["@opam/biniou", "opam:1.2.0"],
                                             ["@opam/cppo", "opam:1.6.6"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/easy-format",
                                             "opam:1.3.1"],
                                             ["@opam/yojson", "opam:1.7.0"],
                                             ["ocaml", "4.7.1004"]])}]])],
  ["ocaml",
  new Map([["4.7.1004",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/ocaml__4.7.1004__d443949a/",
             packageDependencies: new Map([["ocaml", "4.7.1004"]])}]])],
  ["pesy",
  new Map([["0.4.2",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/pesy__0.4.2__befdcaab/",
             packageDependencies: new Map([["pesy", "0.4.2"]])}]])],
  ["refmterr",
  new Map([["3.1.10",
           {
             packageLocation: "/Users/pawelfalisz/.esy/source/i/refmterr__3.1.10__c289b5fb/",
             packageDependencies: new Map([["@esy-ocaml/reason", "3.4.0"],
                                             ["@opam/dune", "opam:1.10.0"],
                                             ["@opam/re", "opam:1.9.0"],
                                             ["ocaml", "4.7.1004"],
                                             ["refmterr", "3.1.10"]])}]])],
  [null,
  new Map([[null,
           {
             packageLocation: "/Users/pawelfalisz/Documents/Reason/mh2/",
             packageDependencies: new Map([["@esy-ocaml/reason", "3.4.0"],
                                             ["@opam/cohttp", "opam:2.1.2"],
                                             ["@opam/cohttp-lwt-unix",
                                             "opam:2.0.0"],
                                             ["@opam/graphql", "opam:0.9.0"],
                                             ["@opam/graphql-cohttp",
                                             "opam:0.12.1"],
                                             ["@opam/graphql-lwt",
                                             "opam:0.9.0"],
                                             ["@opam/lwt", "opam:4.1.0"],
                                             ["@opam/merlin", "opam:3.3.1"],
                                             ["@opam/yojson", "opam:1.7.0"],
                                             ["ocaml", "4.7.1004"],
                                             ["pesy", "0.4.2"],
                                             ["refmterr", "3.1.10"]])}]])]]);

let locatorsByLocations = new Map([
["../../", topLevelLocator],
  ["../../../../../.esy/source/i/esy_ocaml__s__reason__3.4.0__d55f0cf4/",
  {
    name: "@esy-ocaml/reason",
    reference: "3.4.0"}],
  ["../../../../../.esy/source/i/esy_ocaml__s__substs__0.0.1__19de1ee1/",
  {
    name: "@esy-ocaml/substs",
    reference: "0.0.1"}],
  ["../../../../../.esy/source/i/ocaml__4.7.1004__d443949a/",
  {
    name: "ocaml",
    reference: "4.7.1004"}],
  ["../../../../../.esy/source/i/opam__s__astring__opam__c__0.8.3__3d7df80e/",
  {
    name: "@opam/astring",
    reference: "opam:0.8.3"}],
  ["../../../../../.esy/source/i/opam__s__base64__opam__c__3.2.0__6d458a0f/",
  {
    name: "@opam/base64",
    reference: "opam:3.2.0"}],
  ["../../../../../.esy/source/i/opam__s__base__opam__c__v0.12.2__910d5f6b/",
  {
    name: "@opam/base",
    reference: "opam:v0.12.2"}],
  ["../../../../../.esy/source/i/opam__s__base_bigarray__opam__c__base__37a71828/",
  {
    name: "@opam/base-bigarray",
    reference: "opam:base"}],
  ["../../../../../.esy/source/i/opam__s__base_bytes__opam__c__base__48b6019a/",
  {
    name: "@opam/base-bytes",
    reference: "opam:base"}],
  ["../../../../../.esy/source/i/opam__s__base_threads__opam__c__base__f282958b/",
  {
    name: "@opam/base-threads",
    reference: "opam:base"}],
  ["../../../../../.esy/source/i/opam__s__base_unix__opam__c__base__93427a57/",
  {
    name: "@opam/base-unix",
    reference: "opam:base"}],
  ["../../../../../.esy/source/i/opam__s__biniou__opam__c__1.2.0__7c0af8cd/",
  {
    name: "@opam/biniou",
    reference: "opam:1.2.0"}],
  ["../../../../../.esy/source/i/opam__s__cmdliner__opam__c__1.0.4__11482f41/",
  {
    name: "@opam/cmdliner",
    reference: "opam:1.0.4"}],
  ["../../../../../.esy/source/i/opam__s__cohttp__opam__c__2.1.2__899b7a60/",
  {
    name: "@opam/cohttp",
    reference: "opam:2.1.2"}],
  ["../../../../../.esy/source/i/opam__s__cohttp_lwt__opam__c__2.0.0__8ca82450/",
  {
    name: "@opam/cohttp-lwt",
    reference: "opam:2.0.0"}],
  ["../../../../../.esy/source/i/opam__s__cohttp_lwt_unix__opam__c__2.0.0__a6d7d14d/",
  {
    name: "@opam/cohttp-lwt-unix",
    reference: "opam:2.0.0"}],
  ["../../../../../.esy/source/i/opam__s__conduit__opam__c__1.4.0__09ce1a40/",
  {
    name: "@opam/conduit",
    reference: "opam:1.4.0"}],
  ["../../../../../.esy/source/i/opam__s__conduit_lwt__opam__c__1.4.0__238a923e/",
  {
    name: "@opam/conduit-lwt",
    reference: "opam:1.4.0"}],
  ["../../../../../.esy/source/i/opam__s__conduit_lwt_unix__opam__c__1.4.0__8a9a0f04/",
  {
    name: "@opam/conduit-lwt-unix",
    reference: "opam:1.4.0"}],
  ["../../../../../.esy/source/i/opam__s__conf_m4__opam__c__1__2502196a/",
  {
    name: "@opam/conf-m4",
    reference: "opam:1"}],
  ["../../../../../.esy/source/i/opam__s__conf_which__opam__c__1__cafac9ea/",
  {
    name: "@opam/conf-which",
    reference: "opam:1"}],
  ["../../../../../.esy/source/i/opam__s__cppo__opam__c__1.6.6__2223b9cb/",
  {
    name: "@opam/cppo",
    reference: "opam:1.6.6"}],
  ["../../../../../.esy/source/i/opam__s__crunch__opam__c__3.0.0__20d82e87/",
  {
    name: "@opam/crunch",
    reference: "opam:3.0.0"}],
  ["../../../../../.esy/source/i/opam__s__digestif__opam__c__0.7.2__4eb458ae/",
  {
    name: "@opam/digestif",
    reference: "opam:0.7.2"}],
  ["../../../../../.esy/source/i/opam__s__dune__opam__c__1.10.0__6e365125/",
  {
    name: "@opam/dune",
    reference: "opam:1.10.0"}],
  ["../../../../../.esy/source/i/opam__s__easy_format__opam__c__1.3.1__09dd6fc0/",
  {
    name: "@opam/easy-format",
    reference: "opam:1.3.1"}],
  ["../../../../../.esy/source/i/opam__s__eqaf__opam__c__0.4__237234d3/",
  {
    name: "@opam/eqaf",
    reference: "opam:0.4"}],
  ["../../../../../.esy/source/i/opam__s__fieldslib__opam__c__v0.12.0__0c19c421/",
  {
    name: "@opam/fieldslib",
    reference: "opam:v0.12.0"}],
  ["../../../../../.esy/source/i/opam__s__fmt__opam__c__0.8.6__2908bed3/",
  {
    name: "@opam/fmt",
    reference: "opam:0.8.6"}],
  ["../../../../../.esy/source/i/opam__s__graphql__opam__c__0.9.0__bafa9d88/",
  {
    name: "@opam/graphql",
    reference: "opam:0.9.0"}],
  ["../../../../../.esy/source/i/opam__s__graphql__parser__opam__c__0.12.2__e4e7efba/",
  {
    name: "@opam/graphql_parser",
    reference: "opam:0.12.2"}],
  ["../../../../../.esy/source/i/opam__s__graphql_cohttp__opam__c__0.12.1__fa96e479/",
  {
    name: "@opam/graphql-cohttp",
    reference: "opam:0.12.1"}],
  ["../../../../../.esy/source/i/opam__s__graphql_lwt__opam__c__0.9.0__39c8a947/",
  {
    name: "@opam/graphql-lwt",
    reference: "opam:0.9.0"}],
  ["../../../../../.esy/source/i/opam__s__ipaddr__opam__c__3.1.0__caa99f2a/",
  {
    name: "@opam/ipaddr",
    reference: "opam:3.1.0"}],
  ["../../../../../.esy/source/i/opam__s__jbuilder__opam__c__transition__c94246e9/",
  {
    name: "@opam/jbuilder",
    reference: "opam:transition"}],
  ["../../../../../.esy/source/i/opam__s__jsonm__opam__c__1.0.1__0f41f896/",
  {
    name: "@opam/jsonm",
    reference: "opam:1.0.1"}],
  ["../../../../../.esy/source/i/opam__s__logs__opam__c__0.6.3__f0f55b48/",
  {
    name: "@opam/logs",
    reference: "opam:0.6.3"}],
  ["../../../../../.esy/source/i/opam__s__lwt__opam__c__4.1.0__34eb24ea/",
  {
    name: "@opam/lwt",
    reference: "opam:4.1.0"}],
  ["../../../../../.esy/source/i/opam__s__macaddr__opam__c__3.1.0__2640b85c/",
  {
    name: "@opam/macaddr",
    reference: "opam:3.1.0"}],
  ["../../../../../.esy/source/i/opam__s__magic_mime__opam__c__1.1.1__de34e232/",
  {
    name: "@opam/magic-mime",
    reference: "opam:1.1.1"}],
  ["../../../../../.esy/source/i/opam__s__menhir__opam__c__20190613__1111972f/",
  {
    name: "@opam/menhir",
    reference: "opam:20190613"}],
  ["../../../../../.esy/source/i/opam__s__merlin__opam__c__3.3.1__17daace2/",
  {
    name: "@opam/merlin",
    reference: "opam:3.3.1"}],
  ["../../../../../.esy/source/i/opam__s__merlin_extend__opam__c__0.3__6711ef24/",
  {
    name: "@opam/merlin-extend",
    reference: "opam:0.3"}],
  ["../../../../../.esy/source/i/opam__s__num__opam__c__1.1__28057132/",
  {
    name: "@opam/num",
    reference: "opam:1.1"}],
  ["../../../../../.esy/source/i/opam__s__ocaml_compiler_libs__opam__c__v0.12.0__fc7eef4e/",
  {
    name: "@opam/ocaml-compiler-libs",
    reference: "opam:v0.12.0"}],
  ["../../../../../.esy/source/i/opam__s__ocaml_migrate_parsetree__opam__c__1.3.1__2b496e3b/",
  {
    name: "@opam/ocaml-migrate-parsetree",
    reference: "opam:1.3.1"}],
  ["../../../../../.esy/source/i/opam__s__ocamlbuild__opam__c__0.14.0__56d4d3d9/",
  {
    name: "@opam/ocamlbuild",
    reference: "opam:0.14.0"}],
  ["../../../../../.esy/source/i/opam__s__ocamlfind__opam__c__1.8.0__6ce51c9c/",
  {
    name: "@opam/ocamlfind",
    reference: "opam:1.8.0"}],
  ["../../../../../.esy/source/i/opam__s__ocplib_endian__opam__c__1.0__aceff5fc/",
  {
    name: "@opam/ocplib-endian",
    reference: "opam:1.0"}],
  ["../../../../../.esy/source/i/opam__s__parsexp__opam__c__v0.12.0__fe8566da/",
  {
    name: "@opam/parsexp",
    reference: "opam:v0.12.0"}],
  ["../../../../../.esy/source/i/opam__s__ppx__derivers__opam__c__1.2.1__88e907fb/",
  {
    name: "@opam/ppx_derivers",
    reference: "opam:1.2.1"}],
  ["../../../../../.esy/source/i/opam__s__ppx__fields__conv__opam__c__v0.12.0__29747c70/",
  {
    name: "@opam/ppx_fields_conv",
    reference: "opam:v0.12.0"}],
  ["../../../../../.esy/source/i/opam__s__ppx__sexp__conv__opam__c__v0.12.0__0637baeb/",
  {
    name: "@opam/ppx_sexp_conv",
    reference: "opam:v0.12.0"}],
  ["../../../../../.esy/source/i/opam__s__ppxlib__opam__c__0.8.0__2845cbb6/",
  {
    name: "@opam/ppxlib",
    reference: "opam:0.8.0"}],
  ["../../../../../.esy/source/i/opam__s__ptime__opam__c__0.8.5__79d19c69/",
  {
    name: "@opam/ptime",
    reference: "opam:0.8.5"}],
  ["../../../../../.esy/source/i/opam__s__re__opam__c__1.9.0__22ec4eb0/",
  {
    name: "@opam/re",
    reference: "opam:1.9.0"}],
  ["../../../../../.esy/source/i/opam__s__result__opam__c__1.4__606c4200/",
  {
    name: "@opam/result",
    reference: "opam:1.4"}],
  ["../../../../../.esy/source/i/opam__s__rresult__opam__c__0.6.0__108d9e8f/",
  {
    name: "@opam/rresult",
    reference: "opam:0.6.0"}],
  ["../../../../../.esy/source/i/opam__s__seq__opam__c__base__a0c677b1/",
  {
    name: "@opam/seq",
    reference: "opam:base"}],
  ["../../../../../.esy/source/i/opam__s__sexplib0__opam__c__v0.12.0__e49036be/",
  {
    name: "@opam/sexplib0",
    reference: "opam:v0.12.0"}],
  ["../../../../../.esy/source/i/opam__s__sexplib__opam__c__v0.12.0__0d691701/",
  {
    name: "@opam/sexplib",
    reference: "opam:v0.12.0"}],
  ["../../../../../.esy/source/i/opam__s__stdio__opam__c__v0.12.0__81114f79/",
  {
    name: "@opam/stdio",
    reference: "opam:v0.12.0"}],
  ["../../../../../.esy/source/i/opam__s__stdlib_shims__opam__c__0.1.0__610b6088/",
  {
    name: "@opam/stdlib-shims",
    reference: "opam:0.1.0"}],
  ["../../../../../.esy/source/i/opam__s__stringext__opam__c__1.6.0__fd42d57c/",
  {
    name: "@opam/stringext",
    reference: "opam:1.6.0"}],
  ["../../../../../.esy/source/i/opam__s__topkg__opam__c__1.0.0__1e0a2ad6/",
  {
    name: "@opam/topkg",
    reference: "opam:1.0.0"}],
  ["../../../../../.esy/source/i/opam__s__uchar__opam__c__0.0.2__d1ad73a0/",
  {
    name: "@opam/uchar",
    reference: "opam:0.0.2"}],
  ["../../../../../.esy/source/i/opam__s__uri__opam__c__2.2.1__ec78d7e2/",
  {
    name: "@opam/uri",
    reference: "opam:2.2.1"}],
  ["../../../../../.esy/source/i/opam__s__uutf__opam__c__1.0.2__34474f09/",
  {
    name: "@opam/uutf",
    reference: "opam:1.0.2"}],
  ["../../../../../.esy/source/i/opam__s__yojson__opam__c__1.7.0__25fa13aa/",
  {
    name: "@opam/yojson",
    reference: "opam:1.7.0"}],
  ["../../../../../.esy/source/i/pesy__0.4.2__befdcaab/",
  {
    name: "pesy",
    reference: "0.4.2"}],
  ["../../../../../.esy/source/i/refmterr__3.1.10__c289b5fb/",
  {
    name: "refmterr",
    reference: "3.1.10"}]]);


  exports.findPackageLocator = function findPackageLocator(location) {
    let relativeLocation = normalizePath(path.relative(__dirname, location));

    if (!relativeLocation.match(isStrictRegExp))
      relativeLocation = `./${relativeLocation}`;

    if (location.match(isDirRegExp) && relativeLocation.charAt(relativeLocation.length - 1) !== '/')
      relativeLocation = `${relativeLocation}/`;

    let match;

  
      if (relativeLocation.length >= 88 && relativeLocation[87] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 88)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 86 && relativeLocation[85] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 86)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 84 && relativeLocation[83] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 84)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 82 && relativeLocation[81] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 82)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 81 && relativeLocation[80] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 81)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 80 && relativeLocation[79] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 80)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 78 && relativeLocation[77] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 78)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 77 && relativeLocation[76] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 77)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 76 && relativeLocation[75] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 76)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 75 && relativeLocation[74] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 75)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 74 && relativeLocation[73] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 74)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 73 && relativeLocation[72] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 73)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 72 && relativeLocation[71] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 72)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 71 && relativeLocation[70] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 71)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 70 && relativeLocation[69] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 70)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 69 && relativeLocation[68] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 69)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 68 && relativeLocation[67] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 68)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 67 && relativeLocation[66] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 67)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 66 && relativeLocation[65] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 66)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 56 && relativeLocation[55] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 56)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 55 && relativeLocation[54] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 55)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 51 && relativeLocation[50] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 51)))
          return blacklistCheck(match);
      

      if (relativeLocation.length >= 6 && relativeLocation[5] === '/')
        if (match = locatorsByLocations.get(relativeLocation.substr(0, 6)))
          return blacklistCheck(match);
      

    return null;
  };
  

/**
 * Returns the module that should be used to resolve require calls. It's usually the direct parent, except if we're
 * inside an eval expression.
 */

function getIssuerModule(parent) {
  let issuer = parent;

  while (issuer && (issuer.id === '[eval]' || issuer.id === '<repl>' || !issuer.filename)) {
    issuer = issuer.parent;
  }

  return issuer;
}

/**
 * Returns information about a package in a safe way (will throw if they cannot be retrieved)
 */

function getPackageInformationSafe(packageLocator) {
  const packageInformation = exports.getPackageInformation(packageLocator);

  if (!packageInformation) {
    throw makeError(
      `INTERNAL`,
      `Couldn't find a matching entry in the dependency tree for the specified parent (this is probably an internal error)`,
    );
  }

  return packageInformation;
}

/**
 * Implements the node resolution for folder access and extension selection
 */

function applyNodeExtensionResolution(unqualifiedPath, {extensions}) {
  // We use this "infinite while" so that we can restart the process as long as we hit package folders
  while (true) {
    let stat;

    try {
      stat = statSync(unqualifiedPath);
    } catch (error) {}

    // If the file exists and is a file, we can stop right there

    if (stat && !stat.isDirectory()) {
      // If the very last component of the resolved path is a symlink to a file, we then resolve it to a file. We only
      // do this first the last component, and not the rest of the path! This allows us to support the case of bin
      // symlinks, where a symlink in "/xyz/pkg-name/.bin/bin-name" will point somewhere else (like "/xyz/pkg-name/index.js").
      // In such a case, we want relative requires to be resolved relative to "/xyz/pkg-name/" rather than "/xyz/pkg-name/.bin/".
      //
      // Also note that the reason we must use readlink on the last component (instead of realpath on the whole path)
      // is that we must preserve the other symlinks, in particular those used by pnp to deambiguate packages using
      // peer dependencies. For example, "/xyz/.pnp/local/pnp-01234569/.bin/bin-name" should see its relative requires
      // be resolved relative to "/xyz/.pnp/local/pnp-0123456789/" rather than "/xyz/pkg-with-peers/", because otherwise
      // we would lose the information that would tell us what are the dependencies of pkg-with-peers relative to its
      // ancestors.

      if (lstatSync(unqualifiedPath).isSymbolicLink()) {
        unqualifiedPath = path.normalize(path.resolve(path.dirname(unqualifiedPath), readlinkSync(unqualifiedPath)));
      }

      return unqualifiedPath;
    }

    // If the file is a directory, we must check if it contains a package.json with a "main" entry

    if (stat && stat.isDirectory()) {
      let pkgJson;

      try {
        pkgJson = JSON.parse(readFileSync(`${unqualifiedPath}/package.json`, 'utf-8'));
      } catch (error) {}

      let nextUnqualifiedPath;

      if (pkgJson && pkgJson.main) {
        nextUnqualifiedPath = path.resolve(unqualifiedPath, pkgJson.main);
      }

      // If the "main" field changed the path, we start again from this new location

      if (nextUnqualifiedPath && nextUnqualifiedPath !== unqualifiedPath) {
        unqualifiedPath = nextUnqualifiedPath;
        continue;
      }
    }

    // Otherwise we check if we find a file that match one of the supported extensions

    const qualifiedPath = extensions
      .map(extension => {
        return `${unqualifiedPath}${extension}`;
      })
      .find(candidateFile => {
        return existsSync(candidateFile);
      });

    if (qualifiedPath) {
      return qualifiedPath;
    }

    // Otherwise, we check if the path is a folder - in such a case, we try to use its index

    if (stat && stat.isDirectory()) {
      const indexPath = extensions
        .map(extension => {
          return `${unqualifiedPath}/index${extension}`;
        })
        .find(candidateFile => {
          return existsSync(candidateFile);
        });

      if (indexPath) {
        return indexPath;
      }
    }

    // Otherwise there's nothing else we can do :(

    return null;
  }
}

/**
 * This function creates fake modules that can be used with the _resolveFilename function.
 * Ideally it would be nice to be able to avoid this, since it causes useless allocations
 * and cannot be cached efficiently (we recompute the nodeModulePaths every time).
 *
 * Fortunately, this should only affect the fallback, and there hopefully shouldn't be a
 * lot of them.
 */

function makeFakeModule(path) {
  const fakeModule = new Module(path, false);
  fakeModule.filename = path;
  fakeModule.paths = Module._nodeModulePaths(path);
  return fakeModule;
}

/**
 * Normalize path to posix format.
 */

// eslint-disable-next-line no-unused-vars
function normalizePath(fsPath) {
  return process.platform === 'win32' ? fsPath.replace(backwardSlashRegExp, '/') : fsPath;
}

/**
 * Forward the resolution to the next resolver (usually the native one)
 */

function callNativeResolution(request, issuer) {
  if (issuer.endsWith('/')) {
    issuer += 'internal.js';
  }

  try {
    enableNativeHooks = false;

    // Since we would need to create a fake module anyway (to call _resolveLookupPath that
    // would give us the paths to give to _resolveFilename), we can as well not use
    // the {paths} option at all, since it internally makes _resolveFilename create another
    // fake module anyway.
    return Module._resolveFilename(request, makeFakeModule(issuer), false);
  } finally {
    enableNativeHooks = true;
  }
}

/**
 * This key indicates which version of the standard is implemented by this resolver. The `std` key is the
 * Plug'n'Play standard, and any other key are third-party extensions. Third-party extensions are not allowed
 * to override the standard, and can only offer new methods.
 *
 * If an new version of the Plug'n'Play standard is released and some extensions conflict with newly added
 * functions, they'll just have to fix the conflicts and bump their own version number.
 */

exports.VERSIONS = {std: 1};

/**
 * Useful when used together with getPackageInformation to fetch information about the top-level package.
 */

exports.topLevel = {name: null, reference: null};

/**
 * Gets the package information for a given locator. Returns null if they cannot be retrieved.
 */

exports.getPackageInformation = function getPackageInformation({name, reference}) {
  const packageInformationStore = packageInformationStores.get(name);

  if (!packageInformationStore) {
    return null;
  }

  const packageInformation = packageInformationStore.get(reference);

  if (!packageInformation) {
    return null;
  }

  return packageInformation;
};

/**
 * Transforms a request (what's typically passed as argument to the require function) into an unqualified path.
 * This path is called "unqualified" because it only changes the package name to the package location on the disk,
 * which means that the end result still cannot be directly accessed (for example, it doesn't try to resolve the
 * file extension, or to resolve directories to their "index.js" content). Use the "resolveUnqualified" function
 * to convert them to fully-qualified paths, or just use "resolveRequest" that do both operations in one go.
 *
 * Note that it is extremely important that the `issuer` path ends with a forward slash if the issuer is to be
 * treated as a folder (ie. "/tmp/foo/" rather than "/tmp/foo" if "foo" is a directory). Otherwise relative
 * imports won't be computed correctly (they'll get resolved relative to "/tmp/" instead of "/tmp/foo/").
 */

exports.resolveToUnqualified = function resolveToUnqualified(request, issuer, {considerBuiltins = true} = {}) {
  // Bailout if the request is a native module

  if (considerBuiltins && builtinModules.has(request)) {
    return null;
  }

  // We allow disabling the pnp resolution for some subpaths. This is because some projects, often legacy,
  // contain multiple levels of dependencies (ie. a yarn.lock inside a subfolder of a yarn.lock). This is
  // typically solved using workspaces, but not all of them have been converted already.

  if (ignorePattern && ignorePattern.test(issuer)) {
    const result = callNativeResolution(request, issuer);

    if (result === false) {
      throw makeError(
        `BUILTIN_NODE_RESOLUTION_FAIL`,
        `The builtin node resolution algorithm was unable to resolve the module referenced by "${request}" and requested from "${issuer}" (it didn't go through the pnp resolver because the issuer was explicitely ignored by the regexp "$$BLACKLIST")`,
        {
          request,
          issuer,
        },
      );
    }

    return result;
  }

  let unqualifiedPath;

  // If the request is a relative or absolute path, we just return it normalized

  const dependencyNameMatch = request.match(pathRegExp);

  if (!dependencyNameMatch) {
    if (path.isAbsolute(request)) {
      unqualifiedPath = path.normalize(request);
    } else if (issuer.match(isDirRegExp)) {
      unqualifiedPath = path.normalize(path.resolve(issuer, request));
    } else {
      unqualifiedPath = path.normalize(path.resolve(path.dirname(issuer), request));
    }
  }

  // Things are more hairy if it's a package require - we then need to figure out which package is needed, and in
  // particular the exact version for the given location on the dependency tree

  if (dependencyNameMatch) {
    const [, dependencyName, subPath] = dependencyNameMatch;

    const issuerLocator = exports.findPackageLocator(issuer);

    // If the issuer file doesn't seem to be owned by a package managed through pnp, then we resort to using the next
    // resolution algorithm in the chain, usually the native Node resolution one

    if (!issuerLocator) {
      const result = callNativeResolution(request, issuer);

      if (result === false) {
        throw makeError(
          `BUILTIN_NODE_RESOLUTION_FAIL`,
          `The builtin node resolution algorithm was unable to resolve the module referenced by "${request}" and requested from "${issuer}" (it didn't go through the pnp resolver because the issuer doesn't seem to be part of the Yarn-managed dependency tree)`,
          {
            request,
            issuer,
          },
        );
      }

      return result;
    }

    const issuerInformation = getPackageInformationSafe(issuerLocator);

    // We obtain the dependency reference in regard to the package that request it

    let dependencyReference = issuerInformation.packageDependencies.get(dependencyName);

    // If we can't find it, we check if we can potentially load it from the packages that have been defined as potential fallbacks.
    // It's a bit of a hack, but it improves compatibility with the existing Node ecosystem. Hopefully we should eventually be able
    // to kill this logic and become stricter once pnp gets enough traction and the affected packages fix themselves.

    if (issuerLocator !== topLevelLocator) {
      for (let t = 0, T = fallbackLocators.length; dependencyReference === undefined && t < T; ++t) {
        const fallbackInformation = getPackageInformationSafe(fallbackLocators[t]);
        dependencyReference = fallbackInformation.packageDependencies.get(dependencyName);
      }
    }

    // If we can't find the path, and if the package making the request is the top-level, we can offer nicer error messages

    if (!dependencyReference) {
      if (dependencyReference === null) {
        if (issuerLocator === topLevelLocator) {
          throw makeError(
            `MISSING_PEER_DEPENDENCY`,
            `You seem to be requiring a peer dependency ("${dependencyName}"), but it is not installed (which might be because you're the top-level package)`,
            {request, issuer, dependencyName},
          );
        } else {
          throw makeError(
            `MISSING_PEER_DEPENDENCY`,
            `Package "${issuerLocator.name}@${issuerLocator.reference}" is trying to access a peer dependency ("${dependencyName}") that should be provided by its direct ancestor but isn't`,
            {request, issuer, issuerLocator: Object.assign({}, issuerLocator), dependencyName},
          );
        }
      } else {
        if (issuerLocator === topLevelLocator) {
          throw makeError(
            `UNDECLARED_DEPENDENCY`,
            `You cannot require a package ("${dependencyName}") that is not declared in your dependencies (via "${issuer}")`,
            {request, issuer, dependencyName},
          );
        } else {
          const candidates = Array.from(issuerInformation.packageDependencies.keys());
          throw makeError(
            `UNDECLARED_DEPENDENCY`,
            `Package "${issuerLocator.name}@${issuerLocator.reference}" (via "${issuer}") is trying to require the package "${dependencyName}" (via "${request}") without it being listed in its dependencies (${candidates.join(
              `, `,
            )})`,
            {request, issuer, issuerLocator: Object.assign({}, issuerLocator), dependencyName, candidates},
          );
        }
      }
    }

    // We need to check that the package exists on the filesystem, because it might not have been installed

    const dependencyLocator = {name: dependencyName, reference: dependencyReference};
    const dependencyInformation = exports.getPackageInformation(dependencyLocator);
    const dependencyLocation = path.resolve(__dirname, dependencyInformation.packageLocation);

    if (!dependencyLocation) {
      throw makeError(
        `MISSING_DEPENDENCY`,
        `Package "${dependencyLocator.name}@${dependencyLocator.reference}" is a valid dependency, but hasn't been installed and thus cannot be required (it might be caused if you install a partial tree, such as on production environments)`,
        {request, issuer, dependencyLocator: Object.assign({}, dependencyLocator)},
      );
    }

    // Now that we know which package we should resolve to, we only have to find out the file location

    if (subPath) {
      unqualifiedPath = path.resolve(dependencyLocation, subPath);
    } else {
      unqualifiedPath = dependencyLocation;
    }
  }

  return path.normalize(unqualifiedPath);
};

/**
 * Transforms an unqualified path into a qualified path by using the Node resolution algorithm (which automatically
 * appends ".js" / ".json", and transforms directory accesses into "index.js").
 */

exports.resolveUnqualified = function resolveUnqualified(
  unqualifiedPath,
  {extensions = Object.keys(Module._extensions)} = {},
) {
  const qualifiedPath = applyNodeExtensionResolution(unqualifiedPath, {extensions});

  if (qualifiedPath) {
    return path.normalize(qualifiedPath);
  } else {
    throw makeError(
      `QUALIFIED_PATH_RESOLUTION_FAILED`,
      `Couldn't find a suitable Node resolution for unqualified path "${unqualifiedPath}"`,
      {unqualifiedPath},
    );
  }
};

/**
 * Transforms a request into a fully qualified path.
 *
 * Note that it is extremely important that the `issuer` path ends with a forward slash if the issuer is to be
 * treated as a folder (ie. "/tmp/foo/" rather than "/tmp/foo" if "foo" is a directory). Otherwise relative
 * imports won't be computed correctly (they'll get resolved relative to "/tmp/" instead of "/tmp/foo/").
 */

exports.resolveRequest = function resolveRequest(request, issuer, {considerBuiltins, extensions} = {}) {
  let unqualifiedPath;

  try {
    unqualifiedPath = exports.resolveToUnqualified(request, issuer, {considerBuiltins});
  } catch (originalError) {
    // If we get a BUILTIN_NODE_RESOLUTION_FAIL error there, it means that we've had to use the builtin node
    // resolution, which usually shouldn't happen. It might be because the user is trying to require something
    // from a path loaded through a symlink (which is not possible, because we need something normalized to
    // figure out which package is making the require call), so we try to make the same request using a fully
    // resolved issuer and throws a better and more actionable error if it works.
    if (originalError.code === `BUILTIN_NODE_RESOLUTION_FAIL`) {
      let realIssuer;

      try {
        realIssuer = realpathSync(issuer);
      } catch (error) {}

      if (realIssuer) {
        if (issuer.endsWith(`/`)) {
          realIssuer = realIssuer.replace(/\/?$/, `/`);
        }

        try {
          exports.resolveToUnqualified(request, realIssuer, {extensions});
        } catch (error) {
          // If an error was thrown, the problem doesn't seem to come from a path not being normalized, so we
          // can just throw the original error which was legit.
          throw originalError;
        }

        // If we reach this stage, it means that resolveToUnqualified didn't fail when using the fully resolved
        // file path, which is very likely caused by a module being invoked through Node with a path not being
        // correctly normalized (ie you should use "node $(realpath script.js)" instead of "node script.js").
        throw makeError(
          `SYMLINKED_PATH_DETECTED`,
          `A pnp module ("${request}") has been required from what seems to be a symlinked path ("${issuer}"). This is not possible, you must ensure that your modules are invoked through their fully resolved path on the filesystem (in this case "${realIssuer}").`,
          {
            request,
            issuer,
            realIssuer,
          },
        );
      }
    }
    throw originalError;
  }

  if (unqualifiedPath === null) {
    return null;
  }

  try {
    return exports.resolveUnqualified(unqualifiedPath);
  } catch (resolutionError) {
    if (resolutionError.code === 'QUALIFIED_PATH_RESOLUTION_FAILED') {
      Object.assign(resolutionError.data, {request, issuer});
    }
    throw resolutionError;
  }
};

/**
 * Setups the hook into the Node environment.
 *
 * From this point on, any call to `require()` will go through the "resolveRequest" function, and the result will
 * be used as path of the file to load.
 */

exports.setup = function setup() {
  // A small note: we don't replace the cache here (and instead use the native one). This is an effort to not
  // break code similar to "delete require.cache[require.resolve(FOO)]", where FOO is a package located outside
  // of the Yarn dependency tree. In this case, we defer the load to the native loader. If we were to replace the
  // cache by our own, the native loader would populate its own cache, which wouldn't be exposed anymore, so the
  // delete call would be broken.

  const originalModuleLoad = Module._load;

  Module._load = function(request, parent, isMain) {
    if (!enableNativeHooks) {
      return originalModuleLoad.call(Module, request, parent, isMain);
    }

    // Builtins are managed by the regular Node loader

    if (builtinModules.has(request)) {
      try {
        enableNativeHooks = false;
        return originalModuleLoad.call(Module, request, parent, isMain);
      } finally {
        enableNativeHooks = true;
      }
    }

    // The 'pnpapi' name is reserved to return the PnP api currently in use by the program

    if (request === `pnpapi`) {
      return pnpModule.exports;
    }

    // Request `Module._resolveFilename` (ie. `resolveRequest`) to tell us which file we should load

    const modulePath = Module._resolveFilename(request, parent, isMain);

    // Check if the module has already been created for the given file

    const cacheEntry = Module._cache[modulePath];

    if (cacheEntry) {
      return cacheEntry.exports;
    }

    // Create a new module and store it into the cache

    const module = new Module(modulePath, parent);
    Module._cache[modulePath] = module;

    // The main module is exposed as global variable

    if (isMain) {
      process.mainModule = module;
      module.id = '.';
    }

    // Try to load the module, and remove it from the cache if it fails

    let hasThrown = true;

    try {
      module.load(modulePath);
      hasThrown = false;
    } finally {
      if (hasThrown) {
        delete Module._cache[modulePath];
      }
    }

    // Some modules might have to be patched for compatibility purposes

    if (patchedModules.has(request)) {
      module.exports = patchedModules.get(request)(module.exports);
    }

    return module.exports;
  };

  const originalModuleResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (!enableNativeHooks) {
      return originalModuleResolveFilename.call(Module, request, parent, isMain, options);
    }

    const issuerModule = getIssuerModule(parent);
    const issuer = issuerModule ? issuerModule.filename : process.cwd() + '/';

    const resolution = exports.resolveRequest(request, issuer);
    return resolution !== null ? resolution : request;
  };

  const originalFindPath = Module._findPath;

  Module._findPath = function(request, paths, isMain) {
    if (!enableNativeHooks) {
      return originalFindPath.call(Module, request, paths, isMain);
    }

    for (const path of paths) {
      let resolution;

      try {
        resolution = exports.resolveRequest(request, path);
      } catch (error) {
        continue;
      }

      if (resolution) {
        return resolution;
      }
    }

    return false;
  };

  process.versions.pnp = String(exports.VERSIONS.std);

  if (process.env.ESY__NODE_BIN_PATH != null) {
    const delimiter = require('path').delimiter;
    process.env.PATH = `${process.env.ESY__NODE_BIN_PATH}${delimiter}${process.env.PATH}`;
  }
};

exports.setupCompatibilityLayer = () => {
  // see https://github.com/browserify/resolve/blob/master/lib/caller.js
  const getCaller = () => {
    const origPrepareStackTrace = Error.prepareStackTrace;

    Error.prepareStackTrace = (_, stack) => stack;
    const stack = new Error().stack;
    Error.prepareStackTrace = origPrepareStackTrace;

    return stack[2].getFileName();
  };

  // ESLint currently doesn't have any portable way for shared configs to specify their own
  // plugins that should be used (https://github.com/eslint/eslint/issues/10125). This will
  // likely get fixed at some point, but it'll take time and in the meantime we'll just add
  // additional fallback entries for common shared configs.

  for (const name of [`react-scripts`]) {
    const packageInformationStore = packageInformationStores.get(name);
    if (packageInformationStore) {
      for (const reference of packageInformationStore.keys()) {
        fallbackLocators.push({name, reference});
      }
    }
  }

  // We need to shim the "resolve" module, because Liftoff uses it in order to find the location
  // of the module in the dependency tree. And Liftoff is used to power Gulp, which doesn't work
  // at all unless modulePath is set, which we cannot configure from any other way than through
  // the Liftoff pipeline (the key isn't whitelisted for env or cli options).

  patchedModules.set(/^resolve$/, realResolve => {
    const mustBeShimmed = caller => {
      const callerLocator = exports.findPackageLocator(caller);

      return callerLocator && callerLocator.name === 'liftoff';
    };

    const attachCallerToOptions = (caller, options) => {
      if (!options.basedir) {
        options.basedir = path.dirname(caller);
      }
    };

    const resolveSyncShim = (request, {basedir}) => {
      return exports.resolveRequest(request, basedir, {
        considerBuiltins: false,
      });
    };

    const resolveShim = (request, options, callback) => {
      setImmediate(() => {
        let error;
        let result;

        try {
          result = resolveSyncShim(request, options);
        } catch (thrown) {
          error = thrown;
        }

        callback(error, result);
      });
    };

    return Object.assign(
      (request, options, callback) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        } else if (!options) {
          options = {};
        }

        const caller = getCaller();
        attachCallerToOptions(caller, options);

        if (mustBeShimmed(caller)) {
          return resolveShim(request, options, callback);
        } else {
          return realResolve.sync(request, options, callback);
        }
      },
      {
        sync: (request, options) => {
          if (!options) {
            options = {};
          }

          const caller = getCaller();
          attachCallerToOptions(caller, options);

          if (mustBeShimmed(caller)) {
            return resolveSyncShim(request, options);
          } else {
            return realResolve.sync(request, options);
          }
        },
        isCore: request => {
          return realResolve.isCore(request);
        },
      },
    );
  });
};

if (module.parent && module.parent.id === 'internal/preload') {
  exports.setupCompatibilityLayer();

  exports.setup();
}

if (process.mainModule === module) {
  exports.setupCompatibilityLayer();

  const reportError = (code, message, data) => {
    process.stdout.write(`${JSON.stringify([{code, message, data}, null])}\n`);
  };

  const reportSuccess = resolution => {
    process.stdout.write(`${JSON.stringify([null, resolution])}\n`);
  };

  const processResolution = (request, issuer) => {
    try {
      reportSuccess(exports.resolveRequest(request, issuer));
    } catch (error) {
      reportError(error.code, error.message, error.data);
    }
  };

  const processRequest = data => {
    try {
      const [request, issuer] = JSON.parse(data);
      processResolution(request, issuer);
    } catch (error) {
      reportError(`INVALID_JSON`, error.message, error.data);
    }
  };

  if (process.argv.length > 2) {
    if (process.argv.length !== 4) {
      process.stderr.write(`Usage: ${process.argv[0]} ${process.argv[1]} <request> <issuer>\n`);
      process.exitCode = 64; /* EX_USAGE */
    } else {
      processResolution(process.argv[2], process.argv[3]);
    }
  } else {
    let buffer = '';
    const decoder = new StringDecoder.StringDecoder();

    process.stdin.on('data', chunk => {
      buffer += decoder.write(chunk);

      do {
        const index = buffer.indexOf('\n');
        if (index === -1) {
          break;
        }

        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);

        processRequest(line);
      } while (true);
    });
  }
}
