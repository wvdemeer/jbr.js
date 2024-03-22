#!/bin/bash -e

jbr_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

for NR in 1 #2 4
do
    target_dir="${jbr_dir}/test${NR}/"
    echo -ne "\n\nPreparing ${target_dir}...\n\n"
    cd "${target_dir}"
    jbr prepare -v 2>&1 | tee prepare.log
done

echo -ne "\n\nAll Done.\n\n"

