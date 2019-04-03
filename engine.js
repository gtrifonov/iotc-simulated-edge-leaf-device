/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */



const crypto = require('crypto');
const request = require('request-promise-native');
const StatusError = require('./error').StatusError;
const registrationSasTtl = 3600; // 1 hour
const registrationRetryTimeouts = [500, 1000, 2000, 4000];
const minDeviceRegistrationTimeout = 60 * 1000; // 1 minute

const deviceCache = {};




exports.getDeviceConnectionString = async (context, device) => {
    const deviceId = device.deviceId;

    if (deviceCache[deviceId] && deviceCache[deviceId].connectionString) {
        return deviceCache[deviceId].connectionString;
    }

    const connStr = `HostName=${await getDeviceHub(context, device)};DeviceId=${deviceId};SharedAccessKey=${await getDeviceKey(context, deviceId)}`;
    deviceCache[deviceId].connectionString = connStr;
    return connStr;
}

/**
 * Registers this device with DPS, returning the IoT Hub assigned to it.
 */
async function getDeviceHub(context, device) {
    const deviceId = device.deviceId;
    const now = Date.now();

    // A 1 minute backoff is enforced for registration attempts, to prevent unauthorized devices
    // from trying to re-register too often.
    if (deviceCache[deviceId] && deviceCache[deviceId].lasRegisterAttempt && (now - deviceCache[deviceId].lasRegisterAttempt) < minDeviceRegistrationTimeout) {
        const backoff = Math.floor((minDeviceRegistrationTimeout - (now - deviceCache[deviceId].lasRegisterAttempt)) / 1000);
        throw new StatusError(`Unable to register device ${deviceId}. Minimum registration timeout not yet exceeded. Please try again in ${backoff} seconds`, 403);
    }

    deviceCache[deviceId] = {
        ...deviceCache[deviceId],
        lasRegisterAttempt: Date.now()
    }

    const sasToken = await getRegistrationSasToken(context, deviceId);
    const bodyJson = {
        registrationId: deviceId
    };

    
        if (device.gatewayId) {
            bodyJson["data"] = {
                iotcGateway: {
                    iotcGatewayId: device.gatewayId,
                    iotcIsGateway: false
                }
            }
        } 
        
    const registrationOptions = {
        url: `https://${context.dpsEndpoint}/${context.idScope}/registrations/${deviceId}/register?api-version=${context.dpsVersion}`,
        method: 'PUT',
        json: true,
        insecure: true,
        rejectUnauthorized: false,
        headers: { Authorization: sasToken },
        body: bodyJson,
    };

    try {
        context.log(`[HTTP] Initiating device registration ${JSON.stringify(registrationOptions)}`);
        const response = await request(registrationOptions);

        if (response.status !== 'assigning' || !response.operationId) {
            throw new Error('Unknown server response');
        }

        const statusOptions = {
            url: `https://${context.dpsEndpoint}/${context.idScope}/registrations/${deviceId}/operations/${response.operationId}?api-version=${context.dpsVersion}`,
            method: 'GET',
            json: true,
            insecure: true,
            rejectUnauthorized: false,
            headers: { Authorization: sasToken }
        };

        // The first registration call starts the process, we then query the registration status
        // up to 4 times.
        for (const timeout of [...registrationRetryTimeouts, 0 /* Fail right away after the last attempt */]) {
            context.log(`[HTTP] Querying device registration status ${JSON.stringify(statusOptions)}`);
            const statusResponse = await request(statusOptions);

            if (statusResponse.status === 'assigning') {
                await new Promise(resolve => setTimeout(resolve, timeout));
            } else if (statusResponse.status === 'assigned' && statusResponse.registrationState && statusResponse.registrationState.assignedHub) {
                return statusResponse.registrationState.assignedHub;
            } else if (statusResponse.status === 'failed' && statusResponse.registrationState && statusResponse.registrationState.errorCode === 400209) {
                throw new StatusError('The device may be unassociated or blocked', 403);
            } else {
                throw new Error('Unknown server response'+ JSON.stringify(statusResponse));
            }
        }

        throw new Error('Registration was not successful after maximum number of attempts');
    } catch (e) {
        throw new StatusError(`Unable to register device ${deviceId}: ${e.message}`, e.statusCode);
    }
}

async function getRegistrationSasToken(context, deviceId) {
    const uri = encodeURIComponent(`${context.idScope}/registrations/${deviceId}`);
    const ttl = Math.round(Date.now() / 1000) + registrationSasTtl;
    const signature = crypto.createHmac('sha256', new Buffer(await getDeviceKey(context, deviceId), 'base64'))
        .update(`${uri}\n${ttl}`)
        .digest('base64');
    return `SharedAccessSignature sr=${uri}&sig=${encodeURIComponent(signature)}&skn=registration&se=${ttl}`;
}

/**
 * Computes a derived device key using the primary key.
 */
async function getDeviceKey(context, deviceId) {
    if (deviceCache[deviceId] && deviceCache[deviceId].deviceKey) {
        return deviceCache[deviceId].deviceKey;
    }

    const key = crypto.createHmac('SHA256', Buffer.from(await context.getSecret(context, context.primaryKeyUrl), 'base64'))
        .update(deviceId)
        .digest()
        .toString('base64');

    deviceCache[deviceId].deviceKey = key;
    return key;
}
