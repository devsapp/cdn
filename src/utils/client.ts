import {InputProps} from '../common/entity';
import Cdn20180510, * as $Cdn20180510 from '@alicloud/cdn20180510';
import * as $Cdn from '@alicloud/cdn20180510';
import {
    DescribeCdnServiceResponse,
    DescribeUserDomainsResponseBodyDomainsPageData,
    OpenCdnServiceRequest, PushObjectCacheRequest, RefreshObjectCachesRequest
} from '@alicloud/cdn20180510';
import * as $OpenApi from '@alicloud/openapi-client';
import {CDNConfig} from '../lib/interface/cdn/CDNConfig';
import logger from '../common/logger';
import {CatchableError} from '@serverless-devs/core';
import {RefreshConfig} from "../lib/interface/cdn/RefreshConfig";
import {PushObjectCacheConfig} from "../lib/interface/cdn/PushObjectCacheConfig";
import {askForOpenCdnService, retry, SPINNER_VM} from "./util";
import {DEFAULT_MAX_WAIT_MS} from "../common/contants";

export class CDNClient {

    private static instant: CDNClient

    private client: Cdn20180510

    public static async getInstant(inputs: InputProps<CDNConfig>): Promise<CDNClient> {
        const credentials = inputs.credentials;

        SPINNER_VM.start('create the instance of CdnClient');
        if (!CDNClient.instant) {
            CDNClient.instant = new CDNClient();
            CDNClient.instant.client = new Cdn20180510(new $OpenApi.Config({
                accessKeyId: credentials.AccessKeyID,
                accessKeySecret: credentials.AccessKeySecret,
                securityToken: credentials.SecurityToken,
                endpoint: 'cdn.aliyuncs.com'
            }));
        }
        if (!await CDNClient.instant.checkHasOpen()) {
            await askForOpenCdnService(this.instant.openCdnService, inputs);
        }
        SPINNER_VM.stop();
        return CDNClient.instant;
    }

    /**
     * 检测是否已开通
     */
    private async checkHasOpen(): Promise<boolean> {
        SPINNER_VM.start('check the CdnService is open');
        let openCdnServiceRequest = new $Cdn20180510.OpenCdnServiceRequest({});
        try {
            const res: DescribeCdnServiceResponse = await this.client.describeCdnService(openCdnServiceRequest);
            if (res) {
                SPINNER_VM.stop();
                return true;
            }
        } catch (e) {
            const message = e.message;
            if (message.indexOf(403)) {
                logger.warn('The CdnService is not opened!');
                SPINNER_VM.stop();
                return false;
            }
            throw new CatchableError(message);
        }
        SPINNER_VM.stop();
        return false;
    }

    private async openCdnService() {
        SPINNER_VM.start('do open the CdnService');
        await this.client.openCdnService(new OpenCdnServiceRequest({internetChargeType: 'PayByTraffic'}));
        SPINNER_VM.stop();
    }

    public async getCdnDomain(domainName: string): Promise<DescribeUserDomainsResponseBodyDomainsPageData> {
        let request = new $Cdn20180510.DescribeUserDomainsRequest({
            domainName,
        });

        const res = await this.client.describeUserDomains(request);
        if (res.body.domains.pageData.length > 0) {
            return res.body.domains.pageData[0];
        }
        return null;
    }

    public async hasCdnDomain(domainName: string): Promise<boolean> {
        const res = await this.getCdnDomain(domainName);
        if (res) {
            return true;
        }
        return false;
    }

    public async domainHasVerify(domainName: string): Promise<boolean> {
        SPINNER_VM.start('check the domain has been verified');
        let request = new $Cdn20180510.VerifyDomainOwnerRequest({
            domainName,
            verifyType: "dnsCheck",
        });

        try {
            const res = await this.client.verifyDomainOwner(request);
            if (res.body) {
                SPINNER_VM.stop();
                return true;
            }
        } catch (error) {
            // 未通过校验
            const message = error.message;
            if (message.indexOf('DomainOwnerVerifyFail') != -1) {
                SPINNER_VM.stop();
                return false;
            }
            throw new CatchableError(message);
        }
        SPINNER_VM.stop();
        return false;
    }

    public async getDomainVerifyContent(domainName: string): Promise<string> {
        let request = new $Cdn20180510.DescribeVerifyContentRequest({domainName});
        const res = await this.client.describeVerifyContent(request);
        return res.body.content;
    }

    public async addCdnDomain(cdnConfig: CDNConfig, {waitUntilFinished}: { waitUntilFinished?: boolean } = {}) {
        const domainName = cdnConfig.domainName;
        SPINNER_VM.start(`creating cdnDomain ${domainName}`);
        let request = new $Cdn.AddCdnDomainRequest(cdnConfig);

        request.sources = JSON.stringify(cdnConfig.sources);
        await this.client.addCdnDomain(request);

        if (waitUntilFinished) {
            const getCdnDomainFn = this.getCdnDomain;
            await retry(DEFAULT_MAX_WAIT_MS, async () => {
                const r = await getCdnDomainFn(domainName);
                return r.domainStatus.includes('ing') ? null : r;
            })
        }
        SPINNER_VM.info(`create cdnDomain<${domainName}> success!`)
        SPINNER_VM.stop();
    }

    public async updateCdnDomain(cdnConfig: CDNConfig, {waitUntilFinished}: { waitUntilFinished?: boolean } = {}) {
        const domainName = cdnConfig.domainName;
        SPINNER_VM.start(`updating cdnDomain ${domainName}`);

        let request = new $Cdn20180510.ModifyCdnDomainRequest(cdnConfig);
        request.sources = JSON.stringify(cdnConfig.sources);
        await this.client.modifyCdnDomain(request);
        if (waitUntilFinished) {
            const getCdnDomainFn = this.getCdnDomain;
            await retry(DEFAULT_MAX_WAIT_MS, async () => {
                const r = await getCdnDomainFn(domainName);
                return r.domainStatus.includes('ing') ? null : r;
            })
        }
        SPINNER_VM.info(`update cdnDomain<${domainName}> success!`)
        SPINNER_VM.stop();

        // 修改加速区域
        const scope = cdnConfig.scope;
        if (scope) {
            SPINNER_VM.start(`updating cdnDomain scope`);
            let modifySchdmRequest = new $Cdn20180510.ModifyCdnDomainSchdmByPropertyRequest({
                domainName: domainName,
                property: JSON.stringify({coverage: scope})
            });
            await this.client.modifyCdnDomainSchdmByProperty(modifySchdmRequest);
            if (waitUntilFinished) {
                const getCdnDomainFn = this.getCdnDomain;
                await retry(DEFAULT_MAX_WAIT_MS, async () => {
                    const r = await getCdnDomainFn(domainName);
                    return r.domainStatus.includes('ing') ? null : r;
                })
            }
            SPINNER_VM.info('update cdnDomain scope success!')
            SPINNER_VM.stop();
        }
    }

    public async startCdnDomain(domainName: string, {waitUntilFinished}: { waitUntilFinished?: boolean } = {}): Promise<boolean> {
        SPINNER_VM.start(`starting cdnDomain ${domainName}`);
        let request = new $Cdn20180510.StartCdnDomainRequest({domainName});
        try {
            await this.client.startCdnDomain(request);
            if (waitUntilFinished) {
                const getCdnDomainFn = this.getCdnDomain;
                await retry(DEFAULT_MAX_WAIT_MS, async () => {
                    const r = await getCdnDomainFn(domainName);
                    return r.domainStatus.includes('ing') ? null : r;
                })
            }
        } catch (e) {
            if (e.indexOf('NotFound')) {
                logger.error(`The domain: [${domainName}] not found!`);
                SPINNER_VM.stop();
                return false;
            }
            throw new CatchableError(e.message);
        }
        SPINNER_VM.info(`start cdnDomain<${domainName}> success!`)
        SPINNER_VM.stop();
        return true;
    }

    public async stopCdnDomain(domainName: string, {waitUntilFinished}: { waitUntilFinished?: boolean } = {}) {
        SPINNER_VM.start(`stopping cdnDomain ${domainName}`);
        let request = new $Cdn20180510.StopCdnDomainRequest({domainName});
        await this.client.stopCdnDomain(request);
        if (waitUntilFinished) {
            const getCdnDomainFn = this.getCdnDomain;
            await retry(DEFAULT_MAX_WAIT_MS, async () => {
                const r = await getCdnDomainFn(domainName);
                return r.domainStatus.includes('ing') ? null : r;
            })
        }
        SPINNER_VM.info(`stop cdnDomain<${domainName}> success!`)
        SPINNER_VM.stop();
    }

    public async deleteCdnDomain(domainName: string, {waitUntilFinished}: { waitUntilFinished?: boolean } = {}) {
        SPINNER_VM.start(`deleting cdnDomain ${domainName}`);
        let request = new $Cdn20180510.DeleteCdnDomainRequest({domainName});
        await this.client.deleteCdnDomain(request);
        if (waitUntilFinished) {
            const getCdnDomainFn = this.getCdnDomain;
            await retry(DEFAULT_MAX_WAIT_MS, async () => {
                const r = await getCdnDomainFn(domainName);
                return !r;
            })
        }
        SPINNER_VM.info(`delete cdnDomain<${domainName}> success!`)
        SPINNER_VM.stop();
    }

    public async refreshObjectCaches(refreshConfig: RefreshConfig) {
        SPINNER_VM.start('creating refresh object caches task');
        await this.client.refreshObjectCaches(new RefreshObjectCachesRequest({
            objectPath: refreshConfig.objectPaths.join('\n'),
            objectType: refreshConfig.objectType
        }))
        SPINNER_VM.info('refresh object caches task has been pushed!');
        SPINNER_VM.stop();
    }

    public async pushObjectCache(pushObjectCacheConfig: PushObjectCacheConfig) {
        SPINNER_VM.start('creating push object caches task');
        await this.client.pushObjectCache(new PushObjectCacheRequest({
            objectPath: pushObjectCacheConfig.objectPaths.join('\n'),
            area: pushObjectCacheConfig.area,
            l2Preload: pushObjectCacheConfig.l2Preload
        }));

        SPINNER_VM.info('push object caches task has been pushed!');
        SPINNER_VM.stop();
    }
}
