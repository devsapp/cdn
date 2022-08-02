<a name="nUtze"></a>
# 简介
本组件可以帮助你对[阿里云CDN服务](https://www.aliyun.com/product/cdn?spm=5176.21213303.J_6704733920.7.628f53c9eJhJWz&scm=20140722.S_product%40%40%E4%BA%91%E4%BA%A7%E5%93%81%40%4096099._.ID_product%40%40%E4%BA%91%E4%BA%A7%E5%93%81%40%4096099-RL_CDN-LOC_main-OR_ser-V_2-P0_0)控制，实现[部署加速域名](#Iawo9)(添加/修改)、[启动加速域名](#QZNcK)、[停用加速域名](#X1pdD)、[刷新节点上的文件内容](#vNLOP)、[预热源站内容到缓存节点](#dmS46)的功能。
<a name="is408"></a>
# 命令
<a name="Iawo9"></a>
## deploy
修改或者添加加速域名的配置，参考文档 [Add](https://help.aliyun.com/document_detail/91176.htm?spm=a2c4g.11186623.0.0.280d5d7angr9C6#t65090.html)、[Update](https://help.aliyun.com/document_detail/91195.htm?spm=a2c4g.11186623.0.0.280d5d7angr9C6#t65096.html)、[Get](https://help.aliyun.com/document_detail/91187.htm?spm=a2c4g.11186623.0.0.280d5d7angr9C6#doc-api-Cdn-DescribeCdnDomainDetail)。<br />![](https://cdn.nlark.com/yuque/0/2022/jpeg/2754189/1659256792556-19b08e56-1079-4a8e-9fd3-04fe943188e6.jpeg)
<a name="QZNcK"></a>
## start
启动加速域名<br />![](https://cdn.nlark.com/yuque/0/2022/jpeg/2754189/1658117898191-81ae6036-80eb-4081-abcc-3c40ec04ce41.jpeg)
<a name="X1pdD"></a>
## stop
停用加速域名
<a name="vNLOP"></a>
## refresh
刷新节点上的文件内容。被刷新的文件缓存将理解失效，新的请求将回源获取新的文件，支持URL批量刷新。如果需要将文件尽快缓存的缓存节点上可配合[warmUp](#dmS46)命令使用。
> **URL刷新配额**
> - 默认情况下，一个账号每日最多可以提交10000条URL刷新和100个目录刷新，目录刷新包含子目录。如果您的阿里云账号的日带宽峰值大于200 Mbps，您可以参考[配额管理](https://help.aliyun.com/document_detail/256513.htm)申请提升每日配额，阿里云将根据您业务的实际需求进行评估和配置。
> - 默认情况下，一个账号每日最多可以提交20个正则刷新，如果您的阿里云账号的日带宽峰值大于10 Gbps，您可以通过[提交工单](https://selfservice.console.aliyun.com/ticket/createIndex.htm)来申请提升每日配额。
> - 每次请求最多支持提交1000条URL刷新或者100个目录刷新或者1个正则刷新。
> - 单个域名每分钟最多支持提交1000条URL刷新。

<a name="dmS46"></a>
## warmUp
将源站内容主动预热到L2缓存节点上。首次访问可直接命中缓存，缓解源站压力。
> - URL预热配额（每日）：默认情况下，一个账号每日最多可以提交1000条URL预热任务，如果您账号的日带宽峰值大于200 Mbps，可通过[配额管理](https://help.aliyun.com/document_detail/256513.htm)申请提升每日配额，阿里云将根据您业务的实际需求进行评估和配置。
> - 每次最多可以提交100条URL预热任务。
> - 预热队列规则：每个账号的预热队列最大为50000条URL，CDN根据URL提交的先后顺序进行预热，当预热队列中未完成的任务达到了50000条URL时，阿里云CDN将会采取排队机制（即完成排序最前的一条URL预热后才可以继续提交下一条URL预热）完成预热。
> - 预热速度：预热任务的执行速度与需要预热资源的文件平均大小有关，文件平均大小越小，预热速度越快，反之越慢。
> - 单用户调用频率：50次/秒。

<a name="BFSJ8"></a>
## remove
删除加速域名。
<a name="oeHnI"></a>
# YAML规范
<a name="ubSqx"></a>
## Yaml完整配置
```yaml
edition: 1.0.0
name: component-test   #  项目名称
access: default # 密钥别名

services:
  component-test:
    component: devsapp/cdn
    props:
      cdnType: web # 加速域名的业务类型（必填项），可选值：web 图片小文件、download 大文件下载、video 视音频点播
      domainName: xxx.xyz # 加速域名（必填项） 支持泛域名,以英文句号(.)开头，例如.example.com。
      sources: # 回源地址列表（必填项）
        -
          type: oss # 源站类型（必填项），可选值：ipaddr IP源站、domain 域名源站、oss OSS Bucket为源站、fc_domain 函数计算为源站
          content: xxx-html.oss-cn-hangzhou.aliyuncs.com # 回源地址（必填项）
          prot: 80 # 端口（选填项项）可以指定443或80端口，也可以自定义端口，默认值为80端口。443端口支持HTTPS协议回源。
          priority: 20 # 优先级（选填项），可选值：默认值为20。20是主源，30是备源。
          weight: 10 # 回源权重（选填项）,取值范围为100以内，默认值为10。
      checkUrl: # 健康检测URL（选填项）
      scope: domestic # 加速区域（选填项），可选值：domestic 仅中国内地、overseas 全球（不包含中国内地）、global 全球
      topLevelDomain: # 顶级接入域
      refreshConfig: # 刷新节点的文件内容配置（进行refresh操作时必填）
        objectPaths: # 刷新URL （必填项）
          - xxx.xyz/
        objectType: Directory # 刷新的类型（选填项），可选值：File 文件刷新、Directory 目录刷新、Regex 正则刷新
      pushObjectCacheConfig: # 预热源站内容配置（进行warmUp操作时必填）
        objectPaths: # 预热URL，必须以http://或https://开头，不能重复。
          - xxx.xyz/a
        area: # 预热区域（选填项），可选值：domestic 仅中国内地、overseas 全球（不包含中国内地）。如果不传该参数，默认的预热区域为您的域名所配置的CDN加速区域。
        l2Preload: # 是否直接预热到L2节点（选填项），true：代表预热的节点层级必须包含L2节点。false：代表仅预热回源层节点（false为默认值，回源层节点可能是L2节点，也可能是L3节点）。
      waitUntilFinished: true
      maxWaitMs: 120000
      refreshAfterDeploy: true
      autoOpen: true
      autoCreate: true
      autoStart: true

```
<a name="cqWrm"></a>
## 参数解析
| 名称 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| cdnType | String | 是 | 加速域名的业务类型。取值：<br />- web：图片小文件。<br />- download：大文件下载。<br />- video：视音频点播。<br /> |
| domainName | String | 是 | 需要接入CDN的加速域名。<br />支持泛域名，以英文句号（.）开头，例如.example.com。 |
| sources | String | 是 | 回源地址列表。 |
| checkUrl | String | 否 | 健康检测URL。 |
| scope | String | 否 | 加速区域。取值：<br />- domestic（默认值）：仅中国内地。<br />- overseas：全球（不包含中国内地）。<br />- global：全球。<br /> |
| topLevelDomain | String | 否 | 顶级接入域。 |
| refreshConfig | Object | 进行refresh操作时必填<br />| 刷新节点的文件内容配置 |
| pushObjectCacheConfig| Object | 进行warmUp操作时必填| 预热源站内容配置<br /> |
| waitUntilFinished | Boolean | 否 | 是否等待完全执行再进行下一步，默认为true |
| maxWaitMs | number | 否 | 最长等待毫秒数，与waitUntilFinised参数配合使用,超过最长等待时间不再等待，直接执行下一步，默认最长等待七分钟 |
| refreshAfterDeploy | Boolean | 否 | 部署后自动刷新cdn，默认为true |
| autoOpen | Boolean | 否 | cdn服务未开通时自动开通，默认为true |
| autoCreate | Boolean | 否 | start时，加速域名不存在自动创建，默认为true |
| autoStart | Boolean | 否 | 更新加速域名信息时，如果加速域名已停用自动启用，默认为true |

<a name="WTuVN"></a>
### sources
| 参数 | 类型 | 是否必选 | 描述 |
| --- | --- | --- | --- |
| type | String | 是 | 源站类型。取值：<br />ipaddr：IP源站。<br />domain：域名源站。<br />oss：OSS Bucket为源站。<br />fc_domain：函数计算为源站。 |
| content | String | 是 | 回源地址，可以是IP或域名。 |
| port | Integer | 否 | 端口。<br />您可以指定443或80端口，也可以自定义端口，默认值为80端口。443端口支持HTTPS协议回源。 |
| priority | String | 否 | 源站地址对应的优先级。<br />支持20和30，默认值为20。20是主源，30是备源。 |
| weight | String | 否 | 回源权重，取值范围为100以内，默认值为10。 |

<a name="mrwas"></a>
### refreshConfig
| 参数 | 类型 | 是否必选 | 描述 |
| --- | --- | --- | --- |
| objectPaths | Array<String> | 是 | 刷新URL列表 |
| objectType | String | 否 | 刷新的类型。取值：<br />- File（默认值）：文件刷新。<br />- Directory：目录刷新。<br />- Regex：正则刷新。<br />文件刷新和目录刷新的功能说明请参考[刷新和预热资源](https://help.aliyun.com/document_detail/27140.htm)，正则刷新的功能说明和操作示例请参考[正则刷新说明](https://help.aliyun.com/document_detail/146195.htm)。<br />目录刷新默认采用标记资源过期的处理方式，不支持删除目录。目录刷新会将节点上对应目录置为过期，后续有用户访问时，CDN节点将会回源站校验目录是否更新，有更新时从源站重新拉取新版本返回给用户，未有更新时源站响应304状态码。 |

<a name="tPG8B"></a>
### pushObjectCacheConfig
| 名称 | 类型 | 是否必选 | 描述 |
| --- | --- | --- | --- |
| objectPaths | Array<String> | 是 | 预热URL，格式为加速域名/预热的文件。 |
| area | String | 否 | 预热区域。取值：<br />- domestic：仅中国内地。<br />- overseas：全球（不包含中国内地）。<br />如果不传该参数，默认的预热区域为您的域名所配置的CDN加速区域。具体如下：<br />- 域名的加速区域为“仅中国内地”，预热区域是仅中国内地。<br />- 域名的加速区域为“全球”，预热区域是全球。<br />- 域名的加速区域为“全球（不包含中国内地）”，预热区域是全球（不包含中国内地）。<br /> |
| l2Preload | Boolean | 否 | 是否直接预热到L2节点。取值：<br />- true：代表预热的节点层级必须包含L2节点。<br />- false：代表仅预热回源层节点（false为默认值，回源层节点可能是L2节点，也可能是L3节点）。<br /> |
