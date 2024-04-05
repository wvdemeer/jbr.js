#!/bin/bash -e

jbr_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

for NR in 6
do
    target_dir="${jbr_dir}/test${NR}/"
    tar="${jbr_dir}/test${NR}.tar.gz"
    tar_logs="${jbr_dir}/test${NR}_with_logs.tar.gz"
    #echo -ne "\n\nRunning in ${target_dir}...\n\n"

    if [ -e "${tar}" ] 
    then
       rm "${tar}"
    fi
    if [ -e "${tar_logs}" ] 
    then
       rm "${tar_logs}"
    fi

    echo -n "TARing ${NR}..."
    cd "${target_dir}"
    tar cfz "${tar}" input/ output/*.csv generated/out-queries generated/out-fragments/*.csv
    tar cfz "${tar_logs}" input/ output/*.csv generated/out-queries generated/out-fragments/*.csv output/logs/

    echo "DONE"
done

ls -lh "${jbr_dir}"/*.tar.gz
echo -ne "\n\nAll Done.\n\n"

