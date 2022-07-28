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
import {askForOpenCdnService, SPINNER_VM} from "./util";

export class CDNClient {

    private static instant: CDNClient

    private client: Cdn20180510

    public static async getInstant(inputs: InputProps<CDNConfig>): Promise<CDNClient> {
        const credentials = inputs.credentials;

        SPINNER_VM.info('create the instance of CdnClient')
        if (!CDNClient.instant) {
            CDNClient.instant = new CDNClient
            CDNClient.instant.client = new Cdn20180510(new $OpenApi.Config({
                accessKeyId: credentials.AccessKeyID,
                accessKeySecret: credentials.AccessKeySecret,
                securityToken: credentials.SecurityToken,
                endpoint: 'cdn.aliyuncs.com'
            }))
        }
        if (!await CDNClient.instant.checkHasOpen()) {
            await askForOpenCdnService(this.instant.openCdnService, inputs)
        }

        return CDNClient.instant
    }

    /**
     * 检测是否已开通
     */
    private async checkHasOpen(): Promise<boolean> {
        SPINNER_VM.info('check the CdnService is open')
        let openCdnServiceRequest = new $Cdn20180510.OpenCdnServiceRequest({});
        try {
            const res: DescribeCdnServiceResponse = await this.client.describeCdnService(openCdnServiceRequest);
            if (res) {
                return true
            }
        } catch (e) {
            const message = e.message;
            if (message.indexOf(403)) {
                logger.warn('The CdnService is not opened!');
                return false
            }
            throw new CatchableError(message);
        }
        return false;
    }

    private async openCdnService() {
        SPINNER_VM.info('do open the CdnService')
        await this.client.openCdnService(new OpenCdnServiceRequest({internetChargeType: 'PayByTraffic'}));
    }

    public async getCdnDomain(domainName: string): Promise<DescribeUserDomainsResponseBodyDomainsPageData> {
        let request = new $Cdn20180510.DescribeUserDomainsRequest({
            domainName,
        });

        const res = await this.client.describeUserDomains(request)
        if (res.body.domains.pageData.length > 0) {
            return res.body.domains.pageData[0]
        }
        return null
    }

    public async hasCdnDomain(domainName: string): Promise<boolean> {
        const res = await this.getCdnDomain(domainName)
        if (res) {
            return true
        }

        return false
    }

    public async domainHasVerify(domainName: string): Promise<boolean> {
        SPINNER_VM.info('check the domain has been verified')
        let request = new $Cdn20180510.VerifyDomainOwnerRequest({
            domainName,
            verifyType: "dnsCheck",
        });

        try {
            const res = await this.client.verifyDomainOwner(request)
            if (res.body) {
                return true
            }
        } catch (error) {
            // 未通过校验
            const message = error.message;
            if (message.indexOf('DomainOwnerVerifyFail') != -1) {
                return false
            }
            throw new Error(message)
        }
        return false
    }

    public async getDomainVerifyContent(domainName: string): Promise<string> {
        let request = new $Cdn20180510.DescribeVerifyContentRequest({domainName});
        const res = await this.client.describeVerifyContent(request)
        return res.body.content
    }

    public async addCdnDomain(cdnConfig: CDNConfig) {
        SPINNER_VM.info('do add cdnDomain')
        let request = new $Cdn.AddCdnDomainRequest(cdnConfig);

        request.sources = JSON.stringify(cdnConfig.sources)
        await this.client.addCdnDomain(request);

    }

    public async updateCdnDomain(cdnConfig: CDNConfig) {
        SPINNER_VM.info('do update cdnDomain')
        let request = new $Cdn20180510.ModifyCdnDomainRequest(cdnConfig);
        request.sources = JSON.stringify(cdnConfig.sources)
        await this.client.modifyCdnDomain(request);

        // 修改加速区域
        const scope = cdnConfig.scope;
        if (scope) {
            SPINNER_VM.info('do update cdnDomain scope')
            let modifySchdmRequest = new $Cdn20180510.ModifyCdnDomainSchdmByPropertyRequest({
                domainName: cdnConfig.domainName,
                property: `{\\"coverage\\":\\"${scope}\\"}`
            });
            await this.client.modifyCdnDomainSchdmByProperty(modifySchdmRequest)
        }
    }

    public async startCdnDomain(domainName: string): Promise<boolean> {
        SPINNER_VM.info('start cdnDomain')
        let request = new $Cdn20180510.StartCdnDomainRequest({domainName})
        try {
            await this.client.startCdnDomain(request)
        } catch (e) {
            if (e.indexOf('NotFound')) {
                logger.error(`The domain: [${domainName}] not found!`)
                return false
            }
            throw new CatchableError(e.message)
        }
        return true;
    }

    public async stopCdnDomain(domainName: string) {
        SPINNER_VM.info('stop cdnDomain')
        if (!this.hasCdnDomain) {
            throw new CatchableError(`The domain: [${domainName}] not found!`)
        }
        let request = new $Cdn20180510.StopCdnDomainRequest({domainName})
        await this.client.stopCdnDomain(request)
    }

    public async deleteCdnDomain(domainName: string) {
        SPINNER_VM.info('check the cdnDomain if exists')
        let cndDomain = await this.getCdnDomain(domainName)
        if (!cndDomain) {
            logger.error(`加速域名: ${domainName}不存在`)
            return
        }

        let request = new $Cdn20180510.DeleteCdnDomainRequest({domainName});
        SPINNER_VM.info('do delete cdnDomain')
        this.client.deleteCdnDomain(request)
    }

    public async refreshObjectCaches(refreshConfig: RefreshConfig) {
        SPINNER_VM.info('do refresh object caches')
        await this.client.refreshObjectCaches(new RefreshObjectCachesRequest({
            objectPath: refreshConfig.objectPaths.join('\n'),
            objectType: refreshConfig.objectType
        }))
    }

    public async pushObjectCache(pushObjectCacheConfig: PushObjectCacheConfig) {
        SPINNER_VM.info('do push object caches')
        await this.client.pushObjectCache(new PushObjectCacheRequest({
            objectPath: pushObjectCacheConfig.objectPaths.join('\n'),
            area: pushObjectCacheConfig.area,
            l2Preload: pushObjectCacheConfig.L2Preload
        }))
    }
}
