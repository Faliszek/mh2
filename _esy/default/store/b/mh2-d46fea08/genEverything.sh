
#!/bin/bash

set -e
set -u

BOLD=`tput bold`  || BOLD=''   # Select bold mode
BLACK=`tput setaf 0` || BLACK=''
RED=`tput setaf 1` || RED=''
GREEN=`tput setaf 2` || GREEN=''
YELLOW=`tput setaf 3` || YELLOW=''
RESET=`tput sgr0` || RESET=''

MODE="update"

# On Windows, the 'esy pesy' syntax doesn't work as we want it to -
# our bash environment there is always run with 'noprofile',
# so 'pesy' always runs in build mode instead of update mode.

# To make this command work cross-platform, we add a way to override
# the mode via the 'PESY_MODE' environment variable.

set +u
if [ ! -z "${PESY_MODE}" ]; then
  printf "PESY MODE"
  MODE="$PESY_MODE"
else 
  if [[ $SHELL =~ "noprofile" ]]; then
    MODE="build"
  fi
fi
set -u

LAST_EXE_NAME=""
NOTIFIED_USER="false"
BUILD_STALE_PROBLEM="false"

DEFAULT_MAIN_MODULE_NAME="Index"

function notifyUser() {
  if [ "${NOTIFIED_USER}" == "false" ]; then
    echo ""
    if [ "${MODE}" == "build" ]; then
      printf "  %sAlmost there!%s %sWe just need to prepare a couple of files:%s\\n\\n" "${YELLOW}${BOLD}" "${RESET}" "${BOLD}" "${RESET}"
    else
      printf "  %sPreparing for build:%s\\n\\n" "${YELLOW}${BOLD}" "${RESET}"
    fi
    NOTIFIED_USER="true"
  else
    # do nothing
    true
  fi
}


function printDirectory() {
  DIR=$1
  NAME=$2
  NAMESPACE=$3
  REQUIRE=$4
  IS_LAST=$5
  printf "│\\n"
  PREFIX=""
  if [[ "$IS_LAST" == "last" ]]; then
    printf "└─%s/\\n" "$DIR"
    PREFIX="    "
  else
    printf "├─%s/\\n" "$DIR"
    PREFIX="│   "
  fi
  printf "%s%s\\n" "$PREFIX" "$NAME"
  printf "%s%s\\n" "$PREFIX" "$NAMESPACE"
  if [ -z "$REQUIRE" ]; then
    true
  else
    if [ "$REQUIRE" != " " ]; then
      printf   "%s%s\\n" "$PREFIX" "$REQUIRE"
    fi
  fi
}
PACKAGE_NAME="mh2"
PACKAGE_NAME_UPPER_CAMEL="Mh2"
NAMESPACE="Mh2"
PUBLIC_LIB_NAME="mh2.lib"
Test_NAMESPACE="HEY! You Need To Specify a nameSpace: field for test"
Test_INCLUDESUBDIRS=""
#Default Requires
Test_REQUIRE=""
#Default Flags
Test_FLAGS=""
Test_IGNOREDSUBDIRS=""
Test_OCAMLC_FLAGS=""
Test_OCAMLOPT_FLAGS=""
Test_PREPROCESS=""
Test_C_NAMES=""
Test_JSOO_FLAGS=""
Test_JSOO_FILES=""
Test_IMPLEMENTS=""
Test_VIRTUALMODULES=""
Test_RAWBUILDCONFIG=""
Test_RAWBUILDCONFIGFOOTER=""
Test_MODES=""
Test_WRAPPED=""
#Default Namespace
Lib_NAMESPACE="Mh2"
Lib_INCLUDESUBDIRS=""
#Default Requires
Lib_REQUIRE=""
#Default Flags
Lib_FLAGS=""
Lib_IGNOREDSUBDIRS=""
Lib_OCAMLC_FLAGS=""
Lib_OCAMLOPT_FLAGS=""
Lib_PREPROCESS=""
Lib_C_NAMES=""
Lib_JSOO_FLAGS=""
Lib_JSOO_FILES=""
Lib_IMPLEMENTS=""
Lib_VIRTUALMODULES=""
Lib_RAWBUILDCONFIG=""
Lib_RAWBUILDCONFIGFOOTER=""
Lib_MODES=""
Lib_WRAPPED=""
Bin_NAMESPACE="HEY! You Need To Specify a nameSpace: field for bin"
Bin_INCLUDESUBDIRS=""
#Default Requires
Bin_REQUIRE=""
#Default Flags
Bin_FLAGS=""
Bin_IGNOREDSUBDIRS=""
Bin_OCAMLC_FLAGS=""
Bin_OCAMLOPT_FLAGS=""
Bin_PREPROCESS=""
Bin_C_NAMES=""
Bin_JSOO_FLAGS=""
Bin_JSOO_FILES=""
Bin_IMPLEMENTS=""
Bin_VIRTUALMODULES=""
Bin_RAWBUILDCONFIG=""
Bin_RAWBUILDCONFIGFOOTER=""
Bin_MODES=""
Bin_WRAPPED=""
Lib_NAMESPACE="Mh2"
Test_MAIN_MODULE="TestMh2"
Bin_MAIN_MODULE="Server"
Test_REQUIRE=" mh2.lib "
Lib_REQUIRE=" unix graphql graphql-cohttp opium "
Bin_REQUIRE=" mh2.lib "
[ "${MODE}" != "build" ] && 
printDirectory "test" "name:    TestMh2.exe" "main:    ${Test_MAIN_MODULE:-$DEFAULT_MAIN_MODULE_NAME}" "require:$Test_REQUIRE" not-last
[ "${MODE}" != "build" ] && 
printDirectory "lib" "library name: mh2.lib" "namespace:    $Lib_NAMESPACE" "require:     $Lib_REQUIRE" not-last
[ "${MODE}" != "build" ] && 
printDirectory "bin" "name:    Server.exe" "main:    ${Bin_MAIN_MODULE:-$DEFAULT_MAIN_MODULE_NAME}" "require:$Bin_REQUIRE" last
BIN_DIR="${cur__root}/test"
BIN_DUNE_FILE="${BIN_DIR}/dune"
# FOR BINARY IN DIRECTORY Test
Test_MAIN_MODULE="${Test_MAIN_MODULE:-$DEFAULT_MAIN_MODULE_NAME}"

Test_MAIN_MODULE_NAME="${Test_MAIN_MODULE%%.*}"
# https://stackoverflow.com/a/965072
if [ "$Test_MAIN_MODULE_NAME"=="$Test_MAIN_MODULE" ]; then
  # If they did not specify an extension, we'll assume it is .re
  Test_MAIN_MODULE_FILENAME="${Test_MAIN_MODULE}.re"
else
  Test_MAIN_MODULE_FILENAME="${Test_MAIN_MODULE}"
fi

if [ -f  "${BIN_DIR}/${Test_MAIN_MODULE_FILENAME}" ]; then
  true
else
  BUILD_STALE_PROBLEM="true"
  notifyUser
  echo ""
  if [ "${MODE}" == "build" ]; then
    printf "    □  Generate %s main module\\n" "${Test_MAIN_MODULE_FILENAME}"
  else
    printf "    %s☒%s  Generate %s main module\\n" "${BOLD}${GREEN}" "${RESET}" "${Test_MAIN_MODULE_FILENAME}"
    mkdir -p "${BIN_DIR}"
    printf "print_endline(\"Hello!\");" > "${BIN_DIR}/${Test_MAIN_MODULE_FILENAME}"
  fi
fi

if [ -d "${BIN_DIR}" ]; then
  LAST_EXE_NAME="TestMh2.exe"
  BIN_DUNE_EXISTING_CONTENTS=""
  if [ -f "${BIN_DUNE_FILE}" ]; then
    BIN_DUNE_EXISTING_CONTENTS=$(<"${BIN_DUNE_FILE}")
  else
    BIN_DUNE_EXISTING_CONTENTS=""
  fi
  BIN_DUNE_CONTENTS=""
  BIN_DUNE_CONTENTS=$(printf "%s\\n%s" "${BIN_DUNE_CONTENTS}" "; !!!! This dune file is generated from the package.json file by pesy. If you modify it by hand")
  BIN_DUNE_CONTENTS=$(printf "%s\\n%s" "${BIN_DUNE_CONTENTS}" "; !!!! your changes will be undone! Instead, edit the package.json and then rerun 'esy pesy' at the project root.")
  BIN_DUNE_CONTENTS=$(printf "%s\\n%s %s" "${BIN_DUNE_CONTENTS}" "; !!!! If you want to stop using pesy and manage this file by hand, change package.json's 'esy.build' command to: refmterr dune build -p " "${cur__name}")
  BIN_DUNE_CONTENTS=$(printf "%s\\n%s" "${BIN_DUNE_CONTENTS}" "(executable")
  BIN_DUNE_CONTENTS=$(printf "%s\\n %s" "${BIN_DUNE_CONTENTS}" "  ; The entrypoint module")
  BIN_DUNE_CONTENTS=$(printf "%s\\n %s" "${BIN_DUNE_CONTENTS}" "  (name ${Test_MAIN_MODULE_NAME})  ;  From package.json main field")
  BIN_DUNE_CONTENTS=$(printf "%s\\n %s" "${BIN_DUNE_CONTENTS}" "  ; The name of the executable (runnable via esy x TestMh2.exe) ")
  BIN_DUNE_CONTENTS=$(printf "%s\\n %s" "${BIN_DUNE_CONTENTS}" "  (public_name TestMh2.exe)  ;  From package.json name field")

  if [ -z "${Test_JSOO_FLAGS}" ] && [ -z "${Test_JSOO_FILES}" ]; then
    # No jsoo flags whatsoever
    true
  else
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s" "${BIN_DUNE_CONTENTS}" "  (js_of_ocaml ")
    if [ ! -z "${Test_JSOO_FLAGS}" ]; then
      BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "    (flags (${Test_JSOO_FLAGS}))  ; From package.json jsooFlags field")
    fi
    if [ ! -z "${Test_JSOO_FILES}" ]; then
      BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "    (javascript_files ${Test_JSOO_FILES})  ; From package.json jsooFiles field")
    fi
    BIN_DUNE_CONTENTS=$(printf "%s\\n%s" "${BIN_DUNE_CONTENTS}" "   )")
  fi
  if [ ! -z "${Test_REQUIRE}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (libraries ${Test_REQUIRE}) ;  From package.json require field (array of strings)")
  fi
  if [ ! -z "${Test_FLAGS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (flags (${Test_FLAGS})) ;  From package.json flags field")
  fi
  if [ ! -z "${Test_OCAMLC_FLAGS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (ocamlc_flags (${Test_OCAMLC_FLAGS}))  ; From package.json ocamlcFlags field")
  fi
  if [ ! -z "${Test_OCAMLOPT_FLAGS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (ocamlopt_flags (${Test_OCAMLOPT_FLAGS}))  ; From package.json ocamloptFlags field")
  fi
  if [ ! -z "${Test_MODES}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (modes (${Test_MODES}))  ; From package.json modes field")
  fi
  if [ ! -z "${Test_RAWBUILDCONFIG}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  ${Test_RAWBUILDCONFIG} ")
  fi
  if [ ! -z "${Test_PREPROCESS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (preprocess (${Test_PREPROCESS}))  ; From package.json preprocess field")
  fi
  BIN_DUNE_CONTENTS=$(printf "%s\\n%s\\n" "${BIN_DUNE_CONTENTS}" ")")
  if [ ! -z "${Test_IGNOREDSUBDIRS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n%s\\n" "${BIN_DUNE_CONTENTS}" "(ignored_subdirs (${Test_IGNOREDSUBDIRS})) ;  From package.json ignoredSubdirs field")
  fi
  if [ ! -z "${Test_INCLUDESUBDIRS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n%s\\n" "${BIN_DUNE_CONTENTS}" "(include_subdirs ${Test_INCLUDESUBDIRS}) ;  From package.json includeSubdirs field")
  fi

  if [ ! -z "${Test_RAWBUILDCONFIGFOOTER}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "${Test_RAWBUILDCONFIGFOOTER}")
  fi

  if [ "${BIN_DUNE_EXISTING_CONTENTS}" == "${BIN_DUNE_CONTENTS}" ]; then
    true
  else
    notifyUser
    BUILD_STALE_PROBLEM="true"
    if [ "${MODE}" == "build" ]; then
      printf "    □  Update test/dune build config\\n"
    else
      printf "    %s☒%s  Update test/dune build config\\n" "${BOLD}${GREEN}" "${RESET}"
      printf "%s" "${BIN_DUNE_CONTENTS}" > "${BIN_DUNE_FILE}"
      mkdir -p "${BIN_DIR}"
    fi
  fi
else
  BUILD_STALE_PROBLEM="true"
  notifyUser
  if [ "${MODE}" == "build" ]; then
    printf "    □  Generate missing the test directory described in package.json buildDirs\\n"
  else
    printf "    %s☒%s  Generate missing the test directory described in package.json buildDirs\\n" "${BOLD}${GREEN}" "${RESET}"
    mkdir -p "${BIN_DIR}"
  fi
fi

# Perform validation:

LIB_DIR="${cur__root}/lib"
LIB_DUNE_FILE="${LIB_DIR}/dune"

# TODO: Error if there are multiple libraries all using the default namespace.
if [ -d "${LIB_DIR}" ]; then
  true
else
  BUILD_STALE_PROBLEM="true"
  notifyUser
  if [ "${MODE}" == "build" ]; then
    printf "    □  Your project is missing the lib directory described in package.json buildDirs\\n"
  else
    printf "    %s☒%s  Your project is missing the lib directory described in package.json buildDirs\\n" "${BOLD}${GREEN}" "${RESET}"
    mkdir -p "${LIB_DIR}"
  fi
fi

LIB_DUNE_CONTENTS=""
LIB_DUNE_EXISTING_CONTENTS=""
if [ -f "${LIB_DUNE_FILE}" ]; then
  LIB_DUNE_EXISTING_CONTENTS=$(<"${LIB_DUNE_FILE}")
fi
LIB_DUNE_CONTENTS=$(printf "%s\\n%s" "${LIB_DUNE_CONTENTS}" "; !!!! This dune file is generated from the package.json file by pesy. If you modify it by hand")
LIB_DUNE_CONTENTS=$(printf "%s\\n%s" "${LIB_DUNE_CONTENTS}" "; !!!! your changes will be undone! Instead, edit the package.json and then rerun 'esy pesy' at the project root.")
LIB_DUNE_CONTENTS=$(printf "%s\\n%s %s" "${LIB_DUNE_CONTENTS}" "; !!!! If you want to stop using pesy and manage this file by hand, change package.json's 'esy.build' command to: refmterr dune build -p " "${cur__name}")
LIB_DUNE_CONTENTS=$(printf "%s\\n%s" "${LIB_DUNE_CONTENTS}" "(library")
LIB_DUNE_CONTENTS=$(printf "%s\\n %s" "${LIB_DUNE_CONTENTS}" "  ; The namespace that other packages/libraries will access this library through")
LIB_DUNE_CONTENTS=$(printf "%s\\n %s" "${LIB_DUNE_CONTENTS}" "  (name ${Lib_NAMESPACE})")
LIB_DUNE_CONTENTS=$(printf "%s\\n %s" "${LIB_DUNE_CONTENTS}" "  ; Other libraries list this name in their package.json 'require' field to use this library.")
LIB_DUNE_CONTENTS=$(printf "%s\\n %s" "${LIB_DUNE_CONTENTS}" "  (public_name mh2.lib)")
if [ ! -z "${Lib_REQUIRE}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "  (libraries ${Lib_REQUIRE})")
fi
if [ ! -z "${Lib_WRAPPED}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n%s\\n" "${LIB_DUNE_CONTENTS}" "   (wrapped ${Lib_WRAPPED})  ; From package.json wrapped field")
fi
if [ ! -z "${Lib_C_NAMES}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "  (c_names ${Lib_C_NAMES})  ; From package.json cNames field")
fi
if [ -z "${Lib_JSOO_FLAGS}" ] && [ -z "${Lib_JSOO_FILES}" ]; then
  # No jsoo flags whatsoever
  true
else
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s" "${LIB_DUNE_CONTENTS}" "  (js_of_ocaml ")
  if [ ! -z "${Lib_JSOO_FLAGS}" ]; then
    LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "    (flags (${Lib_JSOO_FLAGS}))  ; From package.json jsooFlags field")
  fi
  if [ ! -z "${Lib_JSOO_FILES}" ]; then
    LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "    (javascript_files ${Lib_JSOO_FILES})  ; From package.json jsooFiles field")
  fi
  LIB_DUNE_CONTENTS=$(printf "%s\\n%s" "${LIB_DUNE_CONTENTS}" "   )")
fi
if [ ! -z "${Lib_FLAGS}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "  (flags (${Lib_FLAGS}))  ; From package.json flags field")
fi
if [ ! -z "${Lib_OCAMLC_FLAGS}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "  (ocamlc_flags (${Lib_OCAMLC_FLAGS}))  ; From package.json ocamlcFlags field")
fi
if [ ! -z "${Lib_OCAMLOPT_FLAGS}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "  (ocamlopt_flags (${Lib_OCAMLOPT_FLAGS})) ; From package.json ocamloptFlags")
fi
if [ ! -z "${Lib_MODES}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "  (modes (${Lib_MODES}))  ; From package.json modes field")
fi
if [ ! -z "${Lib_IMPLEMENTS}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "  (implements ${Lib_IMPLEMENTS}) ; From package.json implements")
fi
if [ ! -z "${Lib_VIRTUALMODULES}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "  (virtual_modules ${Lib_VIRTUALMODULES}) ; From package.json virtualModules")
fi
if [ ! -z "${Lib_RAWBUILDCONFIG}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "  ${Lib_RAWBUILDCONFIG} ")
fi
if [ ! -z "${Lib_PREPROCESS}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "  (preprocess (${Lib_PREPROCESS}))  ; From package.json preprocess field")
fi
LIB_DUNE_CONTENTS=$(printf "%s\\n%s\\n" "${LIB_DUNE_CONTENTS}" ")")

if [ ! -z "${Lib_IGNOREDSUBDIRS}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n%s\\n" "${LIB_DUNE_CONTENTS}" "(ignored_subdirs (${Lib_IGNOREDSUBDIRS}))  ; From package.json ignoreSubdirs field")
fi
if [ ! -z "${Lib_INCLUDESUBDIRS}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n%s\\n" "${LIB_DUNE_CONTENTS}" "(include_subdirs ${Lib_INCLUDESUBDIRS})  ; From package.json includeSubdirs field")
fi

if [ ! -z "${Lib_RAWBUILDCONFIGFOOTER}" ]; then
  LIB_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${LIB_DUNE_CONTENTS}" "${Lib_RAWBUILDCONFIGFOOTER}")
fi

if [ "${LIB_DUNE_EXISTING_CONTENTS}" == "${LIB_DUNE_CONTENTS}" ]; then
  true
else
  notifyUser
  BUILD_STALE_PROBLEM="true"
  if [ "${MODE}" == "build" ]; then
    printf "    □  Update lib/dune build config\\n"
  else
    printf "    %s☒%s  Update lib/dune build config\\n" "${BOLD}${GREEN}" "${RESET}"
    printf "%s" "$LIB_DUNE_CONTENTS" > "${LIB_DUNE_FILE}"
  fi
fi
BIN_DIR="${cur__root}/bin"
BIN_DUNE_FILE="${BIN_DIR}/dune"
# FOR BINARY IN DIRECTORY Bin
Bin_MAIN_MODULE="${Bin_MAIN_MODULE:-$DEFAULT_MAIN_MODULE_NAME}"

Bin_MAIN_MODULE_NAME="${Bin_MAIN_MODULE%%.*}"
# https://stackoverflow.com/a/965072
if [ "$Bin_MAIN_MODULE_NAME"=="$Bin_MAIN_MODULE" ]; then
  # If they did not specify an extension, we'll assume it is .re
  Bin_MAIN_MODULE_FILENAME="${Bin_MAIN_MODULE}.re"
else
  Bin_MAIN_MODULE_FILENAME="${Bin_MAIN_MODULE}"
fi

if [ -f  "${BIN_DIR}/${Bin_MAIN_MODULE_FILENAME}" ]; then
  true
else
  BUILD_STALE_PROBLEM="true"
  notifyUser
  echo ""
  if [ "${MODE}" == "build" ]; then
    printf "    □  Generate %s main module\\n" "${Bin_MAIN_MODULE_FILENAME}"
  else
    printf "    %s☒%s  Generate %s main module\\n" "${BOLD}${GREEN}" "${RESET}" "${Bin_MAIN_MODULE_FILENAME}"
    mkdir -p "${BIN_DIR}"
    printf "print_endline(\"Hello!\");" > "${BIN_DIR}/${Bin_MAIN_MODULE_FILENAME}"
  fi
fi

if [ -d "${BIN_DIR}" ]; then
  LAST_EXE_NAME="Server.exe"
  BIN_DUNE_EXISTING_CONTENTS=""
  if [ -f "${BIN_DUNE_FILE}" ]; then
    BIN_DUNE_EXISTING_CONTENTS=$(<"${BIN_DUNE_FILE}")
  else
    BIN_DUNE_EXISTING_CONTENTS=""
  fi
  BIN_DUNE_CONTENTS=""
  BIN_DUNE_CONTENTS=$(printf "%s\\n%s" "${BIN_DUNE_CONTENTS}" "; !!!! This dune file is generated from the package.json file by pesy. If you modify it by hand")
  BIN_DUNE_CONTENTS=$(printf "%s\\n%s" "${BIN_DUNE_CONTENTS}" "; !!!! your changes will be undone! Instead, edit the package.json and then rerun 'esy pesy' at the project root.")
  BIN_DUNE_CONTENTS=$(printf "%s\\n%s %s" "${BIN_DUNE_CONTENTS}" "; !!!! If you want to stop using pesy and manage this file by hand, change package.json's 'esy.build' command to: refmterr dune build -p " "${cur__name}")
  BIN_DUNE_CONTENTS=$(printf "%s\\n%s" "${BIN_DUNE_CONTENTS}" "(executable")
  BIN_DUNE_CONTENTS=$(printf "%s\\n %s" "${BIN_DUNE_CONTENTS}" "  ; The entrypoint module")
  BIN_DUNE_CONTENTS=$(printf "%s\\n %s" "${BIN_DUNE_CONTENTS}" "  (name ${Bin_MAIN_MODULE_NAME})  ;  From package.json main field")
  BIN_DUNE_CONTENTS=$(printf "%s\\n %s" "${BIN_DUNE_CONTENTS}" "  ; The name of the executable (runnable via esy x Server.exe) ")
  BIN_DUNE_CONTENTS=$(printf "%s\\n %s" "${BIN_DUNE_CONTENTS}" "  (public_name Server.exe)  ;  From package.json name field")

  if [ -z "${Bin_JSOO_FLAGS}" ] && [ -z "${Bin_JSOO_FILES}" ]; then
    # No jsoo flags whatsoever
    true
  else
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s" "${BIN_DUNE_CONTENTS}" "  (js_of_ocaml ")
    if [ ! -z "${Bin_JSOO_FLAGS}" ]; then
      BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "    (flags (${Bin_JSOO_FLAGS}))  ; From package.json jsooFlags field")
    fi
    if [ ! -z "${Bin_JSOO_FILES}" ]; then
      BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "    (javascript_files ${Bin_JSOO_FILES})  ; From package.json jsooFiles field")
    fi
    BIN_DUNE_CONTENTS=$(printf "%s\\n%s" "${BIN_DUNE_CONTENTS}" "   )")
  fi
  if [ ! -z "${Bin_REQUIRE}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (libraries ${Bin_REQUIRE}) ;  From package.json require field (array of strings)")
  fi
  if [ ! -z "${Bin_FLAGS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (flags (${Bin_FLAGS})) ;  From package.json flags field")
  fi
  if [ ! -z "${Bin_OCAMLC_FLAGS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (ocamlc_flags (${Bin_OCAMLC_FLAGS}))  ; From package.json ocamlcFlags field")
  fi
  if [ ! -z "${Bin_OCAMLOPT_FLAGS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (ocamlopt_flags (${Bin_OCAMLOPT_FLAGS}))  ; From package.json ocamloptFlags field")
  fi
  if [ ! -z "${Bin_MODES}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (modes (${Bin_MODES}))  ; From package.json modes field")
  fi
  if [ ! -z "${Bin_RAWBUILDCONFIG}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  ${Bin_RAWBUILDCONFIG} ")
  fi
  if [ ! -z "${Bin_PREPROCESS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "  (preprocess (${Bin_PREPROCESS}))  ; From package.json preprocess field")
  fi
  BIN_DUNE_CONTENTS=$(printf "%s\\n%s\\n" "${BIN_DUNE_CONTENTS}" ")")
  if [ ! -z "${Bin_IGNOREDSUBDIRS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n%s\\n" "${BIN_DUNE_CONTENTS}" "(ignored_subdirs (${Bin_IGNOREDSUBDIRS})) ;  From package.json ignoredSubdirs field")
  fi
  if [ ! -z "${Bin_INCLUDESUBDIRS}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n%s\\n" "${BIN_DUNE_CONTENTS}" "(include_subdirs ${Bin_INCLUDESUBDIRS}) ;  From package.json includeSubdirs field")
  fi

  if [ ! -z "${Bin_RAWBUILDCONFIGFOOTER}" ]; then
    BIN_DUNE_CONTENTS=$(printf "%s\\n %s\\n" "${BIN_DUNE_CONTENTS}" "${Bin_RAWBUILDCONFIGFOOTER}")
  fi

  if [ "${BIN_DUNE_EXISTING_CONTENTS}" == "${BIN_DUNE_CONTENTS}" ]; then
    true
  else
    notifyUser
    BUILD_STALE_PROBLEM="true"
    if [ "${MODE}" == "build" ]; then
      printf "    □  Update bin/dune build config\\n"
    else
      printf "    %s☒%s  Update bin/dune build config\\n" "${BOLD}${GREEN}" "${RESET}"
      printf "%s" "${BIN_DUNE_CONTENTS}" > "${BIN_DUNE_FILE}"
      mkdir -p "${BIN_DIR}"
    fi
  fi
else
  BUILD_STALE_PROBLEM="true"
  notifyUser
  if [ "${MODE}" == "build" ]; then
    printf "    □  Generate missing the bin directory described in package.json buildDirs\\n"
  else
    printf "    %s☒%s  Generate missing the bin directory described in package.json buildDirs\\n" "${BOLD}${GREEN}" "${RESET}"
    mkdir -p "${BIN_DIR}"
  fi
fi
if [ -f  "${cur__root}/dune" ]; then
  true
else
  BUILD_STALE_PROBLEM="true"
  notifyUser
  if [ "${MODE}" == "build" ]; then
    printf "    □  Update ./dune to ignore node_modules\\n"
  else
    printf "    %s☒%s  Update ./dune to ignore node_modules\\n" "${BOLD}${GREEN}" "${RESET}"
    printf "(dirs (:standard \\ node_modules \\ _esy))" > "${cur__root}/dune"
  fi
fi

if [ -f  "${cur__root}/${PACKAGE_NAME}.opam" ]; then
  true
else
  BUILD_STALE_PROBLEM="true"
  notifyUser
  if [ "${MODE}" == "build" ]; then
    printf "    □  Add %s\\n" "${PACKAGE_NAME}.opam"
  else
    printf "    %s☒%s  Add %s\\n" "${BOLD}${GREEN}" "${RESET}" "${PACKAGE_NAME}.opam" 
    touch "${cur__root}/${PACKAGE_NAME}.opam"
  fi
fi

if [ -f  "${cur__root}/dune-project" ]; then
  true
else
  BUILD_STALE_PROBLEM="true"
  notifyUser
  if [ "${MODE}" == "build" ]; then
    printf "    □  Add a ./dune-project\\n"
  else
    printf "    %s☒%s  Add a ./dune-project\\n" "${BOLD}${GREEN}" "${RESET}"
    printf "(lang dune 1.6)\\n (name %s)" "${PACKAGE_NAME}" > "${cur__root}/dune-project"
  fi
fi


if [ "${MODE}" == "build" ]; then
  if [ "${BUILD_STALE_PROBLEM}" == "true" ]; then
    printf "\\n  %sTo perform those updates and build run:%s\n\n" "${BOLD}${YELLOW}" "${RESET}"
    printf "    esy pesy\\n\\n\\n\\n"
    exit 1
  else
    # If you list a refmterr as a dev dependency, we'll use it!
    BUILD_FAILED=""
    if hash refmterr 2>/dev/null; then
      refmterr dune build -p "${PACKAGE_NAME}" || BUILD_FAILED="true"
    else
      dune build -p "${PACKAGE_NAME}" || BUILD_FAILED="true"
    fi
    if [ -z "$BUILD_FAILED" ]; then
      printf "\\n%s  Build Succeeded!%s " "${BOLD}${GREEN}" "${RESET}"
      if [ -z "$LAST_EXE_NAME" ]; then
        printf "\\n\\n"
        true
      else
        # If we built an EXE
        printf "%sTo test a binary:%s\\n\\n" "${BOLD}" "${RESET}"
        printf "      esy x %s\\n\\n\\n" "${LAST_EXE_NAME}"
      fi
      true
    else
      exit 1
    fi
  fi
else
  # In update mode.
  if [ "${BUILD_STALE_PROBLEM}" == "true" ]; then
    printf "\\n  %sUpdated!%s %sNow run:%s\\n\\n" "${BOLD}${GREEN}" "${RESET}" "${BOLD}" "${RESET}"
    printf "    esy build\\n\\n\\n"
  else
    printf "\\n  %sAlready up to date!%s %sNow run:%s\\n\\n" "${BOLD}${GREEN}" "${RESET}" "${BOLD}" "${RESET}"
    printf "      esy build\\n\\n\\n"
  fi
fi

