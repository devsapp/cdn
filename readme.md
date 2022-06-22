## 概述
支持对域名（OSS / FC）停用/启用加速域名，以及刷新节点的能力。

## 接口设计
> 所有方法都需要前置校验 CDN 服务是否开通 [参考文档](https://help.aliyun.com/document_detail/91168.htm?spm=a2c4g.11186623.0.0.50225d7a0jcrIa#t65116.html)

### deploy
修改或者添加加速域名的配置，参考文档 [Add](https://help.aliyun.com/document_detail/91176.htm?spm=a2c4g.11186623.0.0.280d5d7angr9C6#t65090.html)、[Update](https://help.aliyun.com/document_detail/91195.htm?spm=a2c4g.11186623.0.0.280d5d7angr9C6#t65096.html)、[Get](https://help.aliyun.com/document_detail/91187.htm?spm=a2c4g.11186623.0.0.280d5d7angr9C6#doc-api-Cdn-DescribeCdnDomainDetail)
```yaml
props:
  # 必填
  cdnType: Enum # 加速域名的业务类型: web / download / video
  domainName: String # 需要接入CDN的加速域名。
  sources:
    - type: Enum # 源站类型。ipaddr：IP源站。domain：域名源站。oss：OSS Bucket为源站。fc_domain：函数计算源站。
      content: String # 回源地址，可以是IP或域名。
      port: Number # 端口 默认80
      priority: Enum # 源站地址对应的优先级，支持20和30，默认值为20。20是主源，30是备源。
      weight: Number # 回源权重，100以内，默认值为10。
  # 选填
  checkUrl: String # 健康检测URL
  scope: Enum # 加速区域。domestic（默认值）：仅中国内地。overseas：全球（不包含中国内地）。global：全球。 PS: 据我了解除了 overseas 都需要实名认证 + 备案
  topLevelDomain: String # 顶级接入域。（只有白名单用户设置才生效，不支持同时传入Sources和TopLevelDomain参数，如果您同时传入Sources和TopLevelDomain参数，TopLevelDomain将不生效。）
```
> 真实的请求体：
> {"scope":"domestic","cdnType":"web","domainName":"test.shoushuai.top","sources":[{"Type":"fc_domain","Content":"poem.shoushuai.top","Priority":"20","Port":80,"Weight":"10"},{"Type":"oss","Content":"fcli-test.oss-cn-shenzhen.aliyuncs.com","Priority":"20","Port":80,"Weight":"10"}]}

> TODO: 和 HTTPS 证书证书关联

支持参数
支持的参数--verify-type   [选填] 校验方式，取值：**dnsCheck**：DNS验证。**fileCheck**：文件验证。
注：

1. 验证域名归属：如果指定了 verify-type，那么仅验证这一种方式就好了；如果没有指定，那么两种方式都需要验证。
1. 如果域名验证不通过：根据 verify-type 引导用户添加验证，如果没有指定 verify-type**，**推荐 DNS 验证。
#### 流程图
![](https://intranetproxy.alipay.com/skylark/lark/0/2022/jpeg/145998/1655719660549-e4169856-2b94-4f7f-beae-d84cb30ea510.jpeg)

文档链接： [是否开通 CDN](https://help.aliyun.com/document_detail/91168.htm?spm=a2c4g.11186623.0.0.50225d7a0jcrIa#t65116.html)、[验证域名归属](https://help.aliyun.com/document_detail/169377.html#section-cdf-gbs-rlf)

### start
启用配置的域名并且状态为停用的加速域名，将DomainStatus变更为Online。[参考文档](https://help.aliyun.com/document_detail/91191.htm?spm=a2c4g.11186623.0.0.280d5d7a8k8t4E#t65093.html)
### stop
停用配置的加速域名，将DomainStatus变更为Offline。[参考文档](https://help.aliyun.com/document_detail/91194.htm?spm=a2c4g.11186623.0.0.280d5d7a8k8t4E#t65092.html)
### refresh
该方法会刷新节点上的文件内容。被刷新的文件缓存将立即失效，新的请求将回源获取最新的文件，支持URL批量刷新。[参考文档](https://help.aliyun.com/document_detail/91164.htm#t156976.html)

接受参数
--object-path  [必填] 刷新URL，格式为**加速域名**或**刷新的文件或目录, **多个URL之间使用换行符（\n）分隔。
--object-type  [选填] 刷新的类型：**File**（默认值）、**Directory、Regex**

### api 【待定】
将 SDK 抛出，参考 [fc api](https://github.com/devsapp/fc-api-component) 组件
