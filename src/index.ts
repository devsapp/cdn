import logger from './common/logger';
import {InputProps} from './common/entity';
import {CDNConfig} from './lib/interface/cdn/CDNConfig';
import {CDNClient} from './utils/client';
import {askForAddFun, handlerPreMethod, HELP_INFO, helpAddCname, wait} from './utils/util';
import {CatchableError, help} from "@serverless-devs/core";

export default class CdnComponent{

  /**
   * 修改或者添加加速域名的配置
   * @param inputs
   * @returns
   */
  async deploy(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs);

    const client = await CDNClient.getInstant(inputs)
    const config = inputs.props
    const domainName = config.domainName;

    let cdnDomain = await client.getCdnDomain(domainName)
    if (cdnDomain) {
      await client.updateCdnDomain(config)
    } else {
      // 校验域名归属
      if (!await client.domainHasVerify(domainName)) {
        const domainVerifyContent = await client.getDomainVerifyContent(domainName);
        throw new CatchableError('Owner verification of the root domain failed.', `Pleas go to the DNS service provider to configure the TXT record\nHost: [verification] Record Type: [TXT] RecordValue: [${domainVerifyContent}]`)
      }
      await client.addCdnDomain(config)

      // 等待5秒，尽量保证可以获取到cname
      await wait(7000);
      cdnDomain = await client.getCdnDomain(domainName)
    }

    // 校验cname是否已添加
    const cname = cdnDomain.cname;
    await helpAddCname(cname, domainName);
  }

  /**
   * 启用配置的域名并且状态为停用的加速域名
   * @param inputs
   */
  async start(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs);
    const instant = await CDNClient.getInstant(inputs);

    const domainName = inputs.props.domainName;
    const cdnDomain = await instant.getCdnDomain(domainName);

    if (!cdnDomain) {
      await askForAddFun(this.deploy, inputs);
      return
    }

    const success = await instant.startCdnDomain(domainName);
    if (!success) {
      await askForAddFun(this.deploy, inputs);
    }

    // 校验cname是否已添加
    const cname = cdnDomain.cname;
    await helpAddCname(cname, domainName);
  }

  /**
   * 停用配置的加速域名
   * @param inputs
   */
  async stop(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs);
    const instant = await CDNClient.getInstant(inputs);
    await instant.stopCdnDomain(inputs.props.domainName);

  }

  /**
   * 刷新节点上的文件内容
   * @param inputs
   */
  async refresh(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs, {
      requiredRefreshConfig: true
    });
    const instant = await CDNClient.getInstant(inputs);
    await instant.refreshObjectCaches(inputs.props.refreshConfig);
  }

  /**
   * 预热源站内容
   * @param inputs
   */
  async warmUp(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs, {
      requiredPushObjectCacheConfig: true
    });
    const instant = await CDNClient.getInstant(inputs);
    await instant.pushObjectCache(inputs.props.pushObjectCacheConfig);
  }

  /**
   * 删除加速域名
   * @param inputs
   */
  async remove(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs);

    const instant = await CDNClient.getInstant(inputs);
    await instant.deleteCdnDomain(inputs.props.domainName);
  }

  /**
   * 帮助命令
   * @param inputs
   */
  async help(inputs: InputProps<CDNConfig>) {
    help(HELP_INFO)
  }

  /**
   * 将 SDK 方法抛出【待定】
   * @param inputs
   */
  async api(inputs: InputProps<CDNConfig>) {
    logger.log(JSON.stringify(inputs, null, 2));
  }
}
