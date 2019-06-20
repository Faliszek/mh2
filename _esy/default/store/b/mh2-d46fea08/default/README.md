# mh2


[![CircleCI](https://circleci.com/gh/yourgithubhandle/mh2/tree/master.svg?style=svg)](https://circleci.com/gh/yourgithubhandle/mh2/tree/master)


**Contains the following libraries and executables:**

```
mh2@0.0.0
│
├─test/
│   name:    TestMh2.exe
│   main:    TestMh2
│   require: mh2.lib
│
├─library/
│   library name: mh2.lib
│   namespace:    Mh2
│   require:
│
└─executable/
    name:    Mh2App.exe
    main:    Mh2App
    require: mh2.lib
```

## Developing:

```
npm install -g esy
git clone <this-repo>
esy install
esy build
```

## Running Binary:

After building the project, you can run the main binary that is produced.

```
esy x Mh2App.exe 
```

## Running Tests:

```
# Runs the "test" command in `package.json`.
esy test
```
