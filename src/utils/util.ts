import {promises} from "dns"
import logger from "../common/logger"
import {InputProps} from "../common/entity";
import * as core from "@serverless-devs/core";
import {CatchableError, getCredential, spinner} from "@serverless-devs/core";
import os from "os";
import path from "path";
import fs from "fs";
import {CDNConfig} from "../lib/interface/cdn/CDNConfig";
import {SourceConfig} from "../lib/interface/cdn/SourceConfig";
import {RefreshConfig} from "../lib/interface/cdn/RefreshConfig";
import {PushObjectCacheConfig} from "../lib/interface/cdn/PushObjectCacheConfig";
import {Ora} from "ora";

const {lodash: _} = core;
const MINIMIST_HELP_OPT = {
    boolean: ['help'],
    alias: { help: 'h' },
}

const CDN_TYPES = ['web', 'download', 'video']
const SOURCE_TYPES = ['ipaddr', 'domain', 'oss', 'fc_domain']
const SOURCE_PRIORITIES = [20, 30]
const SOURCE_WEIGHT_MAX_VAL = 100
const SCOPES = ['domestic', 'overseas', 'global']
const REFRESH_CONFIG_OBJECT_TYPES = ['File', 'Directory', 'Regex']
const PUSH_OBJECT_CACHE_CONFIG_AREAS = ['domestic', 'overseas']
let SPINNER_VM : Ora = null
export {SPINNER_VM}

export async function hasAddCname(cname: string, domainName: string): Promise<boolean> {
    let cnames = []
    try {
        cnames = await promises.resolve(domainName, 'CNAME')
        logger.info(cnames)
    } catch (error) {
        // 如果code为ENODATA表示该域名下没有映射cname
        if (error.code != 'ENOTFOUND') {
            throw new CatchableError(error.message)
        } else {
            return false
        }
    }

    if (cnames.findIndex(i => i == cname) > -1) {
        return true
    }
    return false
}

/**
 * 所有操作的前置处理
 * @param inputs
 */
export async function handlerPreMethod(inputs: InputProps<CDNConfig>, { requiredRefreshConfig, requiredPushObjectCacheConfig }: { requiredRefreshConfig?: boolean; requiredPushObjectCacheConfig?: boolean } = {}) {

    // 判断是否是 help，如果是则退出不处理
    if (isHelp(inputs.args, inputs.argsObj)) {
        return inputs;
    }

    SPINNER_VM = spinner('start action')

    await initCredentials(inputs);
    // 校验props
    validateProps(inputs, {requiredRefreshConfig, requiredPushObjectCacheConfig});

    await updateCore(); // 更新到最新版本的 core

    return inputs;
}

export async function initCredentials(inputs: InputProps<CDNConfig>) {
    SPINNER_VM.info('init credentials')
    if (!inputs.credentials) {
        inputs.credentials = await getCredential(inputs.project.access);
    }
}

export function validateProps(inputs: InputProps<CDNConfig>, { requiredRefreshConfig, requiredPushObjectCacheConfig }: { requiredRefreshConfig?: boolean; requiredPushObjectCacheConfig?: boolean } = {}) {
    SPINNER_VM.start('start to verify the validity of props');
    const errMsgs = []

    // 校验密钥别名是否填写
    SPINNER_VM.info('verify the validity of credentials')
    if (!inputs.credentials) {
        errMsgs.push('Please fill in the correct access!')
    }
    const props = inputs.props;
    if (!props) {
        errMsgs.push('cdnType, domainName and sources are required!')
    }
    // cdnType
    const cdnType = props.cdnType;
    if (!cdnType) {
        errMsgs.push('cdnType is required!')
    }
    if (!isInArray(CDN_TYPES, cdnType)) {
        errMsgs.push(`Pleas fill in cdnType with ${CDN_TYPES.join("|")}`)
    }

    // domainName
    const domainName = props.domainName;
    if (!domainName) {
        errMsgs.push('domainName is required!')
    }

    // sources
    sourcesValidate(props.sources)

    const scope = props.scope;
    if (scope && !isInArray(SCOPES, scope)) {
        errMsgs.push(`Pleas fill in scope with ${SCOPES.join("|")}`)
    }

    if (requiredRefreshConfig) {
        const refreshConfig = inputs.props.refreshConfig;
        if (!refreshConfig) {
            errMsgs.push('refreshConfig is required!')
        }
        errMsgs.push(...refreshConfigValidate(refreshConfig, domainName));
    }

    if (requiredPushObjectCacheConfig) {
        const pushObjectCacheConfig = inputs.props.pushObjectCacheConfig;
        if (!pushObjectCacheConfig) {
            errMsgs.push('pushObjectCacheConfig is required!')
        }
        errMsgs.push(...pushObjectCacheConfigValidate(pushObjectCacheConfig, domainName));
    }

    if (errMsgs.length > 0) {
        throw new CatchableError(errMsgs.join("\n"))
    }
    SPINNER_VM.stop();
}

export function refreshConfigValidate(refreshConfig: RefreshConfig, domainName: string): Array<string> {
    SPINNER_VM.info('verify the validity of refreshConfig')
    const objectPaths = refreshConfig.objectPaths;
    const errMsgs = []

    if (_.isEmpty(objectPaths)) {
        errMsgs.push(`objectPaths expected is required.`)
    }

    if (!_.isArray(objectPaths)) {
        errMsgs.push('objectPaths expected is array.')
    }

    const objectType = refreshConfig.objectType;

    if (objectType && isInArray(REFRESH_CONFIG_OBJECT_TYPES, objectType)) {
        errMsgs.push(`Pleas fill in refreshConfig's objectType with ${REFRESH_CONFIG_OBJECT_TYPES.join("|")}`)
    }

    if (!objectType || objectType == 'File' || objectType == 'Directory') {
        objectPaths.forEach((i, index) => {
            i = i.trim()
            index = index + 1
            if (!i.startsWith('http://') && !i.startsWith('https://')) {
                errMsgs.push(`objectPaths's NO.${index} item verify fail，objectPaths's item expected is string that start with [http://] or [https://]!`)
            }
            if (objectType == 'Directory' && !i.endsWith("/")) {
                errMsgs.push(`objectPaths's NO.${index} item verify fail，objectPaths's item expected is string that end with [/]!`)
            }
            const host = new URL(i).host;
            if (domainName && host != domainName) {
                errMsgs.push(`objectPaths's NO.${index} item verify fail，objectPaths's item expected is url that host is domainName: ${domainName}!`)
            }
        })
    }
    if (errMsgs.length > 0) {
        errMsgs.splice(0, 0, 'refreshConfig validate fail items:\n');
    }
    return errMsgs
}

export function pushObjectCacheConfigValidate(pushObjectCacheConfig: PushObjectCacheConfig, domainName: string): Array<string> {
    SPINNER_VM.info('verify the validity of pushObjectCacheConfig')
    const objectPaths = pushObjectCacheConfig.objectPaths;
    const errMsgs = []

    if (_.isEmpty(objectPaths)) {
        errMsgs.push(`pushObjectCacheConfig's objectPaths is required.`)
    }

    if (!_.isArray(objectPaths)) {
        errMsgs.push(`pushObjectCacheConfig's objectPaths expected is array.`)
    }


    objectPaths.forEach((i, index) => {
        index = index + 1
        if (!i.startsWith('http://') && !i.startsWith('https://')) {
            errMsgs.push(`objectPaths's NO.${index} item verify fail，objectPaths's item expected is string that start with [http://] or [https://]!`)
        }
        const host = new URL(i).host;
        if (domainName && host != domainName) {
            errMsgs.push(`objectPaths's NO.${index} item verify fail，objectPaths's item expected is url that host is domainName: ${domainName}!`)
        }
    })

    const area = pushObjectCacheConfig.area;
    if (area && !isInArray(PUSH_OBJECT_CACHE_CONFIG_AREAS, area)) {
        errMsgs.push(`Pleas fill in pushObjectCacheConfig's area with ${PUSH_OBJECT_CACHE_CONFIG_AREAS.join("|")}`)
    }

    if (errMsgs.length > 0) {
        errMsgs.splice(0, 0, 'pushObjectCacheConfig validate fail items:\n');
    }

    return errMsgs
}

export function sourcesValidate(sources: Array<SourceConfig>): Array<string> {
    SPINNER_VM.info('verify the validity of sources')

    const errmsgs = []
    if (!_.isEmpty(sources)) {
        errmsgs.push('sources is required!')
    }

    if (!_.isArray(sources)) {
        errmsgs.push('sources expected is array.')
    }

    sources.forEach((i, index) => {
        index = index +1
        if (!(i instanceof Object)) {
            errmsgs.push(`sources's NO.${index} item verify fail，sources's item expected is Object that contain type, content, port, priority, weight`)
        }

        const sourceType = i.type;
        if (!sourceType) {
            errmsgs.push(`sources's NO.${index} item verify fail，sources's type is required!`)
        }
        if (!isInArray(SOURCE_TYPES, sourceType)) {
            errmsgs.push(`sources's NO.${index} item verify fail，Pleas fill in sources's type with ${SOURCE_TYPES.join("|")}`)
        }

        if (!i.content) {
            errmsgs.push(`sources's NO.${index} item verify fail，sources's content is required!`)
        }

        const sourcePort = i.port;
        if (sourcePort && !(typeof sourcePort == 'number')) {
            errmsgs.push(`sources's NO.${index} item verify fail，sources's port expected is number!`)
        }

        const sourcePriority = i.priority;
        if (sourcePriority && !isInArray(SOURCE_PRIORITIES, sourcePriority)) {
            errmsgs.push(`sources's NO.${index} item verify fail，Pleas fill in sources's priority with ${SOURCE_PRIORITIES.join("|")}`)
        }

        const sourceWeight = i.weight
        if (sourceWeight) {
            if (!(typeof sourceWeight == 'number')) {
                errmsgs.push(`sources's NO.${index} item verify fail，sources's weight expected is number!`)
            }

            if (sourceWeight > SOURCE_WEIGHT_MAX_VAL) {
                errmsgs.push(`sources's NO.${index} item verify fail，sources's weight expected is number that lesser than ${SOURCE_WEIGHT_MAX_VAL}!`)
            }
        }
    })

    return errmsgs;
}


export function isHelp(args: string, argsObj?: any) {
    // @ts-ignore
    const comParse: any = core.commandParse({args, argsObj}, MINIMIST_HELP_OPT);
    return comParse?.data?.help;
}

export async function updateCore() {
    if (!_.isFunction(core.getAvailablePort)) {
        try {
            const homePath = _.isFunction(core.getRootHome) ? core.getRootHome() : os.homedir();
            const corePath = path.join(homePath, 'cache', 'core');
            const lockPath = path.resolve(corePath, '.s.lock');
            const result = await core.request(
                'https://registry.devsapp.cn/simple/devsapp/core/releases/latest',
            );
            const version = result.tag_name;
            const url = `https://registry.devsapp.cn/simple/devsapp/core/zipball/${version}`;
            const filename = `core@${version}.zip`;
            // @ts-ignore
            await core.downloadRequest(url, corePath, {filename, extract: true, strip: 1});
            fs.writeFileSync(lockPath, JSON.stringify({version}, null, 2));
        } catch (error) {
            logger.log(
                "\nWARNING\n======================\n* Exception happened! Please execute 's clean --cache' and try again",
                'yellow',
            );
            process.exit(1);
        }
    }
}

export function isInArray(arr: Array<any>, target: any): boolean {
    if (!arr) {
        return false;
    }
    if (!_.isArray(arr)) {
        return false;
    }
    return arr.findIndex(i => i == target) != -1;
}

