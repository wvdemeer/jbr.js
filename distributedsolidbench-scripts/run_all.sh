#!/bin/bash -e

jbr_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

SELF_DNS="$(cat /var/emulab/boot/nodeid).wall1.ilabt.imec.be"

for NR in 7
do
    target_dir="${jbr_dir}/test${NR}/"
    echo -ne "\n\nRunning ${target_dir}...\n\n"
    cd "${target_dir}"

    #echo
    #CSS_DATA_DIR="${target_dir}generated/out-fragments/http/${SELF_DNS}_3003/"
    #echo "First check if something listens at 3003..."
    #if ss -lnp --tcp | grep 3003
    #then
    #        echo 'Found active CSS. Cannot continue.'
    #        exit 1
    #else
    #        echo 'No active CSS.'
    #fi
    #echo
    #echo "Will start CSS from ${CSS_DATA_DIR} (log in run_ccs.log)..."
    #(npx @solid/community-server@6.1.0 -c input/css-localhost-3003-config.json -f "${CSS_DATA_DIR}" --port 3003 --baseUrl "http://${SELF_DNS}:3003" 2>&1 > run_ccs.log) &
    #sleep 10
    #echo 'Assuming CSS has started...'
    #echo

    mkdir -p output/logs
    jbr run -v 2>&1 | tee run.log

    echo DONE
    #echo Kill CSS background job %1
    #kill -INT %1
    #sleep 4
    #echo Hopefully CSS was killed
    #ss -lnp --tcp | grep 3003
    #echo
done

echo -ne "\n\nAll Done.\n\n"


