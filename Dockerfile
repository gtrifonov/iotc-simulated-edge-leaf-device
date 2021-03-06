FROM node:jessie

ENV SCOPEID=${SCOPEID}
ENV SASKEY=${SASKEY}
ENV DPS_ENDPOINT=${DPS_ENDPOINT}
ENV DPS_VERSION=${DPS_VERSION}
ENV DEVICE_ID=${DEVICE_ID}
ENV EDGEHOST=${EDGEHOST}
ENV GATEWAY_ID=${GATEWAY_ID}

WORKDIR /usr/local/share/ca-certificates/
COPY ./certs/azure-iot-test-only.root.ca.cert.pem ./azure-iot-test-only.root.ca.cert.pem.crt
RUN update-ca-certificates

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json package-lock.json ./
COPY ./certs/azure-iot-test-only.root.ca.cert.pem ./

RUN npm install

# Bundle app source
COPY . .

CMD [ "npm", "start" ]