<h1 align="center">Alibaba Cloud CDN Serverless Devs Component</h1>
<p align="center" class="flex justify-center">
  <a href="https://nodejs.org/en/" class="ml-1">
    <img src="https://img.shields.io/badge/node-%3E%3D%2010.8.0-brightgreen" alt="node.js version">
  </a>
  <a href="https://github.com/devsapp/cdn/blob/master/LICENSE" class="ml-1">
    <img src="https://img.shields.io/badge/License-MIT-green" alt="license">
  </a>
  <a href="https://github.com/devsapp/cdn/issues" class="ml-1">
    <img src="https://img.shields.io/github/issues/devsapp/cdn" alt="issues">
  </a>
  </a>
</p>

<p align="center">
  <span><b><a href="./readme.md">中文</a> ｜ <a href="./readme_en.md">English</a></b></span><br>
</p>

<a name="nUtze"></a>
# Introduction
The Component help you control[Alibaba Cloud CDN](https://www.alibabacloud.com/product/content-delivery-network)，help you[Deploy Cdn Domain](#Iawo9)(add/update)、[Start Cdn Domain](#QZNcK)、[Stop Cdn Domain](#X1pdD)、[Refreshes files on Alibaba Cloud CDN edge nodes](#vNLOP)、[Prefetches content from origin servers to L2 CDN edge nodes](#dmS46)。
<a name="is408"></a>
# Commands
<a name="Iawo9"></a>
## deploy
Add or update Cdn Domain，API Reference[Add](https://www.alibabacloud.com/help/en/alibaba-cloud-cdn/latest/addcdndomain?spm=a2c63.p38356.0.0.462d7b9fO6CxGU#t65090.html)、[Get](https://www.alibabacloud.com/help/en/alibaba-cloud-cdn/latest/describecdndomaindetail?spm=a2c63.p38356.0.0.462d7b9fO6CxGU#t65100.html)。<br />![](https://cdn.nlark.com/yuque/0/2022/jpeg/2754189/1659256792556-19b08e56-1079-4a8e-9fd3-04fe943188e6.jpeg)
<a name="QZNcK"></a>
Output：
```yaml
cdn-service: 
  cdnType:       web
  domainName:    cdn.xxx.xyz
  status:        online
  cname:         cdn.fitzdev.xyz.w.kunlunaq.com
  sources: 
    - 
      content:  xxx-vue3.vue-service.xxx.cn-shenzhen.fc.devsapp.net
      port:     80
      priority: 20
      type:     fc_domain
      weight:   10
  refreshConfig: 
    objectPaths: 
      - http://cdn.xxx.xyz/
    objectType:  Directory
```
## start
Start Cdn Domain<br />![](https://cdn.nlark.com/yuque/0/2022/jpeg/2754189/1658117898191-81ae6036-80eb-4081-abcc-3c40ec04ce41.jpeg)
<a name="X1pdD"></a>
## stop
Stop Cdn Domain
<a name="vNLOP"></a>
## refresh
Refreshes files on Alibaba Cloud CDN edge nodes。If you want to prefetches content from origin servers to L2 CDN edge nodes after that，you can use[warmUp](#dmS46)after refresh。
> **Refresh quota**
> - By default, each Alibaba Cloud account can refresh content from up to 10,000 URLs and 100 directories per day. The directories include subdirectories. If the daily peak bandwidth of your Alibaba Cloud account exceeds 200 Mbit/s, you can submit a ticket to request a quota increase. Alibaba Cloud reviews your request and then increases the quota based on your request.
> - By default, each Alibaba Cloud account can submit up to 20 refresh rules that contain regular expressions per day. If the daily peak bandwidth of your Alibaba Cloud account exceeds 10 Gbit/s, you can submit a ticket to request a quota increase.
> - You can specify up to 1,000 URL refresh rules, 100 directory refresh rules, or 1 refresh rule that contains regular expressions in each call.
> - You can refresh up to 1,000 URLs per minute for each domain name.

<a name="dmS46"></a>
## warmUp
Prefetches content from origin servers to L2 CDN edge nodes。
> - Each Alibaba Cloud account can submit at most 1,000 URLs per day. If your daily peak bandwidth exceeds 200 Mbit/s, you can submit a ticket to increase the upper limit. Alibaba Cloud will review your application and then increase the quota accordingly.
> - Each Alibaba Cloud account can submit up to 100 URLs at a time.
> - For each Alibaba Cloud account, the prefetch queue can contain up to 50,000 URLs. Content is prefetched based on the time when the URLs are submitted. The URL that is submitted the earliest has the highest priority. If the number of URLs in the queue reaches 50,000, you cannot submit more URLs until the number drops below 50,000.
> - The time required for a prefetch task to complete is proportional to the size of the prefetched file. In actual practice, most prefetch tasks take 5 to 30 minutes to complete. A task with a smaller average file size takes less time.
> - You can call this operation up to 50 times per second per account.

<a name="BFSJ8"></a>
## remove
Removes a domain name from Alibaba Cloud CDN.
Output：
```yaml
cdn-service: 
  cdnType:       web
  domainName:    cdn.xxx.xyz
  status:        online
  cname:         cdn.fitzdev.xyz.w.kunlunaq.com
  sources: 
    - 
      content:  xxx-vue3.vue-service.xxx.cn-shenzhen.fc.devsapp.net
      port:     80
      priority: 20
      type:     fc_domain
      weight:   10
```
<a name="oeHnI"></a>
# YAML
<a name="ubSqx"></a>
## Yaml complete configuration
```yaml
edition: 1.0.0
name: component-test   #  project name
access: default 

services:
  component-test:
    component: devsapp/cdn
    props:
      cdnType: web # The workload type of the domain name（required），Valid values：web（images and small files）、download（large files）、video（on-demand video and audio streaming）
      domainName: xxx.xyz # The domain names that you want to add to Alibaba Cloud CDN（required）,Wildcard domain names are supported.A wildcard domain name must start with a period (.), such as .example.com.
      sources: # The information about the origin address.（required）
        -
          type: oss # The type of the origin server（required），Valid values:ipaddr（The origin server uses an IP address）、domain（The origin server uses a domain name）、oss（The origin server is an Object Storage Service (OSS) bucket）、fc_domain（ The origin server uses a Function Compute domain name）
          content: xxx-html.oss-cn-hangzhou.aliyuncs.com # The address of the origin server. You can specify an IP address or a domain name（required）
          prot: 80 # port You can specify port 443, port 80, or a custom port. Default value: 80. If you specify port 443, Alibaba Cloud CDN communicates with the origin server over HTTPS.
          priority: 20 # The priority of the origin server if multiple origin servers are specified（not required），Valid values: 20 and 30. Default value: 20. A value of 20 specifies that the origin server is the primary origin server. A value of 30 specifies that the origin server is a secondary origin server.
          weight: 10 # The weight of the origin server if multiple origin servers are specified（not required）,You must specify a value that is smaller than 100. Default value: 10.
      checkUrl: # The URL that is used for health checks.
      scope: domestic # The accelerated region（required）， Valid values: domestic（regions in mainland China）、overseas（regions outside mainland China.）、global（regions inside and outside mainland China），Default value: domestic.
      topLevelDomain: # The top-level domain name
      refreshConfig: # The configuration about refreshes files on Alibaba Cloud CDN edge nodes（required when using refresh command）
        objectPaths: # The URLs from which content is refreshed （required）
          - http://xxx.xyz/
        objectType: Directory # The type of the object that you want to refresh，Valid values: File（refreshes one or more files）、Directory（refreshes the files in one or more directories）、Regex（refreshes content based on regular expressions）
      pushObjectCacheConfig: # The configuration about prefetches content from origin servers to L2 CDN edge nodes（required when using warmUp command）
        objectPaths: # The URLs based on which content is prefetched，must start with http:// or https://，不能重复。
          - http://xxx.xyz/a.html
        area: # The accelerated region where content is to be prefetched，Valid values：domestic (Mainland China Only)、overseas (Global (Excluding Mainland China))。If you do not set this parameter, content in the accelerated region of the domain name is prefetched。
        l2Preload: # Specifies whether to prefetch content to POPs，Valid values: true（prefetch content to L2 edge nodes）。false（prefetch content to regular edge nodes. Regular edge nodes can be L2 edge nodes or L3 edge nodes），Default value: false。
      waitUntilFinished: true
      maxWaitMs: 120000
      refreshAfterDeploy: true
      autoOpen: true
      autoCreate: true
      autoStart: true

```
<a name="cqWrm"></a>
## Parameters
| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| cdnType | String | Yes | The workload type of the domain name. Valid values：<br />- web：images and small files。<br />- download：large files。<br />- video：on-demand video and audio streaming。<br /> |
| domainName | String | Yes | The domain names that you want to add to Alibaba Cloud CDN。<br />Wildcard domain names are supported.A wildcard domain name must start with a period (.), such as .example.com。 |
| sources | Array<[Source](#WTuVN)> | Yes | The information about the origin address。 |
| checkUrl | String | Yes | The URL that is used for health checks。 |
| scope | String | Yes | The accelerated region。Valid values：<br />- domestic（default value）：regions in mainland China。<br />- overseas：regions outside mainland China.。<br />- global：regions inside and outside mainland China。<br /> |
| topLevelDomain | String | No | The top-level domain name。 |
| refreshConfig | [RefreshConfig](#mrwas) | required when using refresh command| The configuration about refreshes files on Alibaba Cloud CDN edge nodes |
| pushObjectCacheConfig| [pushObjectCacheConfig](#tPG8B) | required warmUp using refresh command| The configuration about prefetches content from origin servers to L2 CDN edge nodes |
| waitUntilFinished | Boolean | No | wait until the options finish，default value: true |
| maxWaitMs | number | No | The longest wait time，work with waitUntilFinished，by default the component will wait 7 minutes |
| refreshAfterDeploy | Boolean | No | auto refreshes files on Alibaba Cloud CDN edge nodes after deploy，default value: true |
| autoOpen | Boolean | No |auto activates Alibaba Cloud CDN when it was not activated，default value: true |
| autoCreate | Boolean | No | add the Cdn Domain when you are starting a not existed Cdn Domain，default value: true |
| autoStart | Boolean | No | start the Cdn Domain when your are using the deploy command to update the Cdn Domain，default value: true |

<a name="WTuVN"></a>
### sources
| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| type | String | Yes | The type of the origin server。Valid values：<br />ipaddr：The origin server uses an IP address。<br />domain：The origin server uses a domain name。<br />oss：The origin server is an Object Storage Service (OSS) bucket。<br />fc_domain：The origin server uses a Function Compute domain name。 |
| content | String | Yes | The address of the origin server. You can specify an IP address or a domain name. |
| port | Integer | No |The port that redirects requests to the origin server.You can specify port 443, port 80, or a custom port. Default value: 80. If you specify port 443, Alibaba Cloud CDN communicates with the origin server over HTTPS. |
| priority | String | No | The priority of the origin server if multiple origin servers are specified。Valid values:<br />20 and 30. Default value: 20。<br/>A value of 20 specifies that the origin server is the primary origin server. A value of 30 specifies that the origin server is a secondary origin server。 |
| weight | String | No | The weight of the origin server if multiple origin servers are specified. You must specify a value that is smaller than 100. Default value: 10。 |

<a name="mrwas"></a>
### refreshConfig
| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| objectPaths | `Array<String>` | Yes | The URLs from which content is refreshed |
| objectType | String | No | The type of the object that you want to refresh。Valid values：<br />- File（default value）：refreshes one or more files。<br />- Directory：refreshes the files in one or more directories。<br />- Regex：refreshes content based on regular expressions。<br />If you set the ObjectType parameter to File or Directory, you can view [Refresh and prefetch resources](https://www.alibabacloud.com/help/en/alibaba-cloud-cdn/latest/refresh-and-prefetch-resources) to obtain more information. If you set the ObjectType parameter to Regex, you can view [Configure URL refresh rules that contain regular expressions](https://www.alibabacloud.com/help/en/alibaba-cloud-cdn/latest/zevidn) to obtain more information.If you set the ObjectType parameter to Directory, the resources in the directory that you want to refresh are marked as expired. You cannot delete the directory. If clients request resources on POPs that are marked as expired, Alibaba Cloud CDN checks whether the resources on your origin server are updated. If resources are updated, Alibaba Cloud CDN retrieves the most recent version of the resources and returns the resources to the clients. Otherwise, the origin server returns the 304 status code.   |
> Tips: if refreshAfterDeploy was true and refreshConfig was not be setted, the component will refresh the files about the domainName on Alibaba Cloud CDN edge nodes

<a name="tPG8B"></a>
### pushObjectCacheConfig
| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| objectPaths | `Array<String>` | Yes | The URLs based on which content is prefetched.<br/>Format: accelerated domain name/files to be prefetched。 |
| area | String | No | The accelerated region where content is to be prefetched。 Valid values：<br />- domestic：Mainland China Only。<br />- overseas：Global (Excluding Mainland China)。<br />If you do not set this parameter, content in the accelerated region of the domain name is prefetched. Content is prefetched based on the following rules:<br />- If the accelerated region is set to **Mainland China Only**, content in regions in the Chinese mainland is prefetched. <br />- If the accelerated region is set to **Global**, content in all regions is prefetched. <br />- If the accelerated region is set to **Global (Excluding Mainland China)**, content in regions outside the Chinese mainland is prefetched. <br /> |
| L2Preload | Boolean | No | Specifies whether to prefetch content to POPs. Valid values:<br />- **true**: prefetch content to L2 edge nodes.<br />- **false**: prefetch content to regular edge nodes. Regular edge nodes can be L2 edge nodes or L3 edge nodes. Default value: **false**.<br /> |

# License

The CDN component of Serverless Devs complies with the [MIT License](LICENSE).

All files located in the node_modules directories and external directories are from external maintenance libraries that have their own licenses. We recommend that you read the licenses because their terms may be different from the terms of the [MIT License](LICENSE).

# Community

We welcome your feedback and suggestions. For more information, visit [Serverless Devs issues](https://github.com/serverless-devs/serverless-devs/issues) or [CDN component issues](https://github.com/devsapp/cdn/issues). If you want to join our discussion group or learn about the latest updates in the CDN component, scan one of the following quick response (QR) codes.

<p align="center">

| <img src="https://serverless-article-picture.oss-cn-hangzhou.aliyuncs.com/1635407298906_20211028074819117230.png" width="200px" > | <img src="https://serverless-article-picture.oss-cn-hangzhou.aliyuncs.com/1635407044136_20211028074404326599.png" width="200px" > | <img src="https://serverless-article-picture.oss-cn-hangzhou.aliyuncs.com/1635407252200_20211028074732517533.png" width="200px" > |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| <center>WeChat official account：`serverless`</center>       | <center>WeChat friend：`xiaojiangwh`</center>                | <center>DingTalk Froup：`33947367`</center>                  |

</p>
