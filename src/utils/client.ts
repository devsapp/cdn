import Pop from '@alicloud/pop-core';
import { ICredentials } from '../common/entity';

export const getPopClient = (credentials: ICredentials, endpoint: string, apiVersion: string, timeout?: number) => {
  return new Pop({
    endpoint,
    apiVersion,
    accessKeyId: credentials.AccessKeyID,
    accessKeySecret: credentials.AccessKeySecret,
    // @ts-ignore: Set SecurityToken
    securityToken: credentials.SecurityToken,
    opts: {
      timeout: (timeout || 10) * 1000,
    },
  });
};
