# How to install certs
Follow steps in https://docs.microsoft.com/en-us/azure/iot-edge/how-to-create-transparent-gateway and place certs and private dir into ./ of this repo

# Build Docker
docker build --no-cache .  -t your-registry.azurecr.io/iotc-simulate-device

# Run docker container

Enviroment variable list:

 - SCOPEID
 - SASKEY
 - DPS_ENDPOINT - use azure edge host if dps-proxy module deployed on edge 
 - DPS_VERSION
 - DEVICE_ID - id of leaf device
 - EDGEHOST - hostname of azure edge 
 - GATEWAY_ID - device id which will be reported as a gateway for this leaf device


docker run -it --rm --add-host=Edge-host:10.1.1.1 -e "EDGEHOST=Edge-host" -e "DPS_ENDPOINT=Edge-host:3000" -e "GATEWAY_ID=Edge-host" -e "DEVICE_ID=leaf1" -e "SASKEY=KEY" -e "SCOPEID=SCOPE_ID" gtrifonov.azurecr.io/iotc-simulate-device:latest