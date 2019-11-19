
POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    --ip)
    ip="$2"
    shift # past argument
    shift # past value
    ;;
    --deviceId)
    deviceId="$2"
    shift # past argument
    shift # past value
    ;;
    --gatewayId)
    gatewayId="$2"
    shift # past argument
    shift # past value
    ;;
    --scopeId)
    scopeId="$2"
    shift # past argument
    shift # past value
    ;;
    --sasKey)
    sasKey="$2"
    shift # past argument
    shift # past value
    ;;
    --edgeHost)
    edgeHost="$2"
    shift # past argument
    shift # past value
    ;;

    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done

echo 'ip = ' ${ip}
echo 'deviceId = ' ${deviceId}
echo 'gatewayId = ' ${gatewayId}
echo 'scopeId = ' ${scopeId}
echo 'sasKey = ' ${sasKey}
echo "edgeHost = ${edgeHost}" 

docker run -d --name "edge-leaf-${deviceId}" --network=host --add-host "${edgeHost}:${ip}" --rm -e "EDGEHOST=${edgeHost}" -e "DEVICE_ID=${deviceId}" -e "SASKEY=${sasKey}" -e "SCOPEID=${scopeId}" -e "GATEWAY_ID=${gatewayId}" gtrifonov.azurecr.io/iotc-simulate-leafdevice-transparent-gateway:latest

echo "get logs execute - docker logs edge-leaf-${deviceId} --follow"
docker logs edge-leaf-${deviceId} --follow