import logger from './common/logger';
import { InputProps } from './common/entity';

export default class ComponentDemo {
  /**
   * 修改或者添加加速域名的配置
   * @param inputs
   * @returns
   */
  async deploy(inputs: InputProps) {
    logger.debug(`input: ${JSON.stringify(inputs.props)}`);
    logger.info('command test');
    return { hello: 'world' };
  }

  /**
   * 启用配置的域名并且状态为停用的加速域名
   * @param inputs 
   */
  async start(inputs: InputProps) {
    console.log(JSON.stringify(inputs, null, 2));
  }

  /**
   * 停用配置的加速域名
   * @param inputs 
   */
  async stop(inputs: InputProps) {
    console.log(JSON.stringify(inputs, null, 2));
  }

  /**
   * 刷新节点上的文件内容
   * @param inputs 
   */
  async refresh(inputs: InputProps) {
    console.log(JSON.stringify(inputs, null, 2));
  }

  /**
   * 将 SDK 方法抛出【待定】
   * @param inputs 
   */
  async api(inputs: InputProps) {
    console.log(JSON.stringify(inputs, null, 2));
  }
}
