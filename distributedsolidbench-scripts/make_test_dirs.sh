#!/bin/bash -e

jbr_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

#source_dir="${jbr_dir}/test8/"
source_dir="${HOME}/jbr-shared/"
mkdir -p "${source_dir}generated/populate-cache" "${source_dir}generated/out-snb"

for NR in 1 # 2 4
do
    #export LEFTOVER_HOSTNAME="$(cat /var/emulab/boot/nodeid).wall1.ilabt.imec.be"
    #export LEFTOVER_PORT=3003
    #export LEFTOVER_PROTO=http
    
    #export LEFTOVER_HOSTNAME="$(tail -1 ~/ss_list.txt)"
    # HACK: abusing basename
    #export LEFTOVER_HOSTNAME="$(basename $(cat ~/leftover_host${NR}.txt))"
    export LEFTOVER_HOSTNAME="$(basename $(cat ~/leftover_host.txt))"
    export LEFTOVER_PORT=443
    export LEFTOVER_PROTO=https

    target_dir="${jbr_dir}/test${NR}/"
    echo -ne "\n\nInit ${target_dir}...\n\n"
    cd "${jbr_dir}"
    SOLID_SERVERS_FILE=~/ss_list${NR}.txt jbr init distributedsolidbench "test${NR}"
    cd "${target_dir}"
    mkdir -p generated/out-validate
    mkdir -p output/logs
    HACK_FOR_DISTRIBUTED_SOLIDBENCH=true jbr set-hook hookSparqlEndpoint sparql-endpoint-comunica
    ln -s "${source_dir}generated/populate-cache" "${target_dir}generated/populate-cache"
    ln -s "${source_dir}generated/out-snb" "${target_dir}generated/out-snb"
done

echo -ne "\n\nAll Done.\n\n"
cd "${jbr_dir}"
ls -l test*/generated/

