# How to install certs
https://docs.microsoft.com/en-us/azure/iot-edge/how-to-create-transparent-gateway.
Follow article to generate certs and place  azure-iot-test-only.root.ca.cert.pem to root folder of project.

## To build and run from container 
Build:
change build.sh to replace docker image name with your desired value

Example of execution:
sh ./build.sh

Run:
change run.sh to replace hostname with your PC FQDN hostname which should match value of hostname in edge config.yaml.
replace docker image name with your desired value

Example of execution:

sh ./run.sh --ip 10.30.68.103 --deviceId edge-child-1 --gatewayId edgedemo2 --scopeId 0ne0004A9FC --edgeHost trifonov_surf.redmond.corp.microsoft.com --sasKey YOUR_APP_REGULARDEVICE_SASKEY 