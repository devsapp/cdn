import logger from './common/logger';
import {InputProps} from './common/entity';
import {CDNConfig} from './lib/interface/cdn/CDNConfig';
import {CDNClient} from './utils/client';
import {handlerPreMethod, hasAddCname} from './utils/util';
import {inquirer} from "@serverless-devs/core";

export default class CdnComponent{

  /**
   * 修改或者添加加速域名的配置
   * @param inputs
   * @returns
   */
  async deploy(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs);

    const client = await CDNClient.getInstant(inputs.credentials)
    const config = inputs.props
    let cdnDomain = null
    const domainName = config.domainName;
    if (cdnDomain = await client.getCdnDomain(domainName)) {
      await client.updateCdnDomain(config)
    } else {
      // 校验域名归属
      if (!await client.domainHasVerify(domainName)) {
        const domainVerifyContent = await client.getDomainVerifyContent(domainName);
        logger.warn('Owner verification of the root domain failed.')
        logger.warn('Pleas go to the DNS service provider to configure the TXT record')
        logger.warn(`Host: [verification] Record Type: [TXT] RecordValue: [${domainVerifyContent}]`)
        process.exit(1)
      }
      await client.addCdnDomain(config)
      cdnDomain = await client.getCdnDomain(domainName)
    }

    // 校验cname是否已添加
    const cname = cdnDomain.cname;
    if (!await hasAddCname(cname, domainName)) {
      // 引导用户添加CNAME
      logger.warn('Pleas go to the DNS service provider to configure the CNAME record')
      logger.warn(`RecordValue: ${cname}`)
    }
  }

  /**
   * 启用配置的域名并且状态为停用的加速域名
   * @param inputs
   */
  async start(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs);
    const instant = await CDNClient.getInstant(inputs.credentials);

    const domainName = inputs.props.domainName;
    const hasCdnDomain = await instant.hasCdnDomain(domainName);
    const that = this
    const askForAddFun = async function () {
      const { addCdnDomain } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addCdnDomain',
          message: 'Do you want to add the cdnDomain for you?'
        }
      ])
      if (addCdnDomain) {
        await that.deploy(inputs);
      }
    }

    if (!hasCdnDomain) {
      await askForAddFun()
      return
    }

    const success = await instant.startCdnDomain(domainName);
    if (!success) {
      await askForAddFun();
    }
  }

  /**
   * 停用配置的加速域名
   * @param inputs
   */
  async stop(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs);
    const instant = await CDNClient.getInstant(inputs.credentials);
    await instant.stopCdnDomain(inputs.props.domainName);

  }

  /**
   * 刷新节点上的文件内容
   * @param inputs
   */
  async refresh(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs, true);
    const instant = await CDNClient.getInstant(inputs.credentials);
    await instant.refreshObjectCaches(inputs.props.refreshConfig);
  }

  /**
   * 预热源站内容
   * @param inputs
   */
  async warmUp(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs, false, true);
    const instant = await CDNClient.getInstant(inputs.credentials);
    await instant.pushObjectCache(inputs.props.pushObjectCacheConfig);
  }

  /**
   * 删除加速域名
   * @param inputs
   */
   async remove(inputs: InputProps<CDNConfig>) {
    await handlerPreMethod(inputs);

    const instant = await CDNClient.getInstant(inputs.credentials);
    await instant.deleteCdnDomain(inputs.props.domainName);
  }

  /**
   * 将 SDK 方法抛出【待定】
   * @param inputs
   */
  async api(inputs: InputProps<CDNConfig>) {
    logger.log(JSON.stringify(inputs, null, 2));
  }
}
