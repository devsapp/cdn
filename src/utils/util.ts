import {promises} from "dns"
import logger from "../common/logger"
import {InputProps} from "../common/entity";
import * as core from "@serverless-devs/core";
import {CatchableError, commandParse, getCredential, inquirer, spinner} from "@serverless-devs/core";
import os from "os";
import path from "path";
import fs from "fs";
import {CDNConfig} from "../lib/interface/cdn/CDNConfig";
import {SourceConfig} from "../lib/interface/cdn/SourceConfig";
import {RefreshConfig} from "../lib/interface/cdn/RefreshConfig";
import {PushObjectCacheConfig} from "../lib/interface/cdn/PushObjectCacheConfig";
import {Ora} from "ora";
import {
    MINIMIST_HELP_OPT,
    AUTO_CREATE, AUTO_OPEN,
    CDN_TYPES, DEFAULT_MAX_WAIT_MS,
    PUSH_OBJECT_CACHE_CONFIG_AREAS,
    REFRESH_CONFIG_OBJECT_TYPES, SCOPES,
    SOURCE_PRIORITIES,
    SOURCE_TYPES, SOURCE_WEIGHT_MAX_VAL, AUTO_START
} from "../common/contants";

const {lodash: _} = core;

let SPINNER_VM: Ora = null
export {SPINNER_VM}

export async function helpAddCname(cname: string, domainName: string) {
    if (!await hasAddCname(cname, domainName)) {
        // 引导用户添加CNAME
        logger.warn('Pleas go to the DNS service provider to configure the CNAME record');
        logger.warn(`RecordValue: ${cname}`);
    }
}

export async function hasAddCname(cname: string, domainName: string): Promise<boolean> {
    let cnames = [];
    try {
        cnames = await promises.resolve(domainName, 'CNAME');
        logger.info(cnames);
    } catch (error) {
        // 如果code为ENODATA表示该域名下没有映射cname
        if (error.code != 'ENOTFOUND') {
            throw new CatchableError(error.message);
        } else {
            return false;
        }
    }

    if (cnames.findIndex(i => i == cname) > -1) {
        return true;
    }
    return false;
}

/**
 * 所有操作的前置处理
 * @param inputs
 */
export async function handlerPreMethod(inputs: InputProps<CDNConfig>, {
    requiredRefreshConfig,
    requiredPushObjectCacheConfig
}: { requiredRefreshConfig?: boolean; requiredPushObjectCacheConfig?: boolean } = {}) {

    // 判断是否是 help，如果是则退出不处理
    if (isHelp(inputs.args, inputs.argsObj)) {
        return inputs;
    }

    SPINNER_VM = spinner('start action')

    await initCredentials(inputs);

    // 设置默认值
    setDefaultVal(inputs);

    // 如果deploy后需要刷新的话，需要校验刷新参数正确性
    if (inputs.props.refreshAfterDeploy) {
        requiredRefreshConfig = true;
    }

    // 校验props
    validateProps(inputs, {requiredRefreshConfig, requiredPushObjectCacheConfig});

    await updateCore(); // 更新到最新版本的 core

    return inputs;
}

export async function initCredentials(inputs: InputProps<CDNConfig>) {
    if (_.isEmpty(inputs.credentials)) {
        inputs.credentials = await getCredential(inputs.project.access);
    }
}

export function validateProps(inputs: InputProps<CDNConfig>, {
    requiredRefreshConfig,
    requiredPushObjectCacheConfig
}: { requiredRefreshConfig?: boolean; requiredPushObjectCacheConfig?: boolean } = {}) {
    SPINNER_VM.start('verifying the validity of props');
    const errMsgs = [];

    // 校验密钥别名是否填写
    if (!inputs.credentials) {
        errMsgs.push('Please fill in the correct access!');
    }
    const props = inputs.props;
    if (!props) {
        errMsgs.push('cdnType, domainName and sources are required!');
    }
    // cdnType
    const cdnType = props.cdnType;
    if (!cdnType) {
        errMsgs.push('cdnType is required!');
    }
    if (!isInArray(CDN_TYPES, cdnType)) {
        errMsgs.push(`Pleas fill in cdnType with ${CDN_TYPES.join("|")}`);
    }

    // domainName
    const domainName = props.domainName;
    if (!domainName) {
        errMsgs.push('domainName is required!');
    }

    // sources
    sourcesValidate(props.sources);

    const scope = props.scope;
    if (scope && !isInArray(SCOPES, scope)) {
        errMsgs.push(`Pleas fill in scope with ${SCOPES.join("|")}`);
    }

    if (requiredRefreshConfig) {
        const refreshConfig = inputs.props.refreshConfig;
        if (!refreshConfig) {
            errMsgs.push('refreshConfig is required!');
        }
        errMsgs.push(...refreshConfigValidate(refreshConfig, domainName));
    }

    if (requiredPushObjectCacheConfig) {
        const pushObjectCacheConfig = inputs.props.pushObjectCacheConfig;
        if (!pushObjectCacheConfig) {
            errMsgs.push('pushObjectCacheConfig is required!');
        }
        errMsgs.push(...pushObjectCacheConfigValidate(pushObjectCacheConfig, domainName));
    }

    if (errMsgs.length > 0) {
        throw new CatchableError(errMsgs.join("\n"));
    }
    SPINNER_VM.info('verify the validity of props success!');
    SPINNER_VM.stop();
}

export function refreshConfigValidate(refreshConfig: RefreshConfig, domainName: string): Array<string> {
    SPINNER_VM.start('verifying the validity of refreshConfig');
    const objectPaths = refreshConfig.objectPaths;
    const errMsgs = [];

    if (_.isEmpty(objectPaths)) {
        errMsgs.push(`objectPaths expected is required.`);
    }

    if (!_.isArray(objectPaths)) {
        errMsgs.push('objectPaths expected is array.');
    }

    const objectType = refreshConfig.objectType;

    if (objectType && !isInArray(REFRESH_CONFIG_OBJECT_TYPES, objectType)) {
        errMsgs.push(`Pleas fill in refreshConfig's objectType with ${REFRESH_CONFIG_OBJECT_TYPES.join("|")}`);
    }

    if (!objectType || objectType == 'File' || objectType == 'Directory') {
        objectPaths.forEach((i, index) => {
            i = i.trim();
            index = index + 1;
            if (!i.startsWith('http://') && !i.startsWith('https://')) {
                errMsgs.push(`objectPaths's NO.${index} item verify fail，objectPaths's item expected is string that start with [http://] or [https://]!`);
            } else {
                const host = new URL(i).host;
                if (domainName && host != domainName) {
                    errMsgs.push(`objectPaths's NO.${index} item verify fail，objectPaths's item expected is url that host is domainName: ${domainName}!`);
                }
            }
            if (objectType == 'Directory' && !i.endsWith("/")) {
                errMsgs.push(`objectPaths's NO.${index} item verify fail，objectPaths's item expected is string that end with [/]!`);
            }
        })
    }
    if (errMsgs.length > 0) {
        errMsgs.splice(0, 0, 'refreshConfig validate fail items:\n');
    } else {
        SPINNER_VM.info('verify the validity of refreshConfig success!');
    }
    SPINNER_VM.stop();
    return errMsgs;
}

export function pushObjectCacheConfigValidate(pushObjectCacheConfig: PushObjectCacheConfig, domainName: string): Array<string> {
    SPINNER_VM.start('verifying the validity of pushObjectCacheConfig');
    const objectPaths = pushObjectCacheConfig.objectPaths;
    const errMsgs = []

    if (_.isEmpty(objectPaths)) {
        errMsgs.push(`pushObjectCacheConfig's objectPaths is required.`);
    }

    if (!_.isArray(objectPaths)) {
        errMsgs.push(`pushObjectCacheConfig's objectPaths expected is array.`);
    }


    objectPaths.forEach((i, index) => {
        index = index + 1;
        if (!i.startsWith('http://') && !i.startsWith('https://')) {
            errMsgs.push(`objectPaths's NO.${index} item verify fail，objectPaths's item expected is string that start with [http://] or [https://]!`);
        } else {
            const host = new URL(i).host;
            if (domainName && host != domainName) {
                errMsgs.push(`objectPaths's NO.${index} item verify fail，objectPaths's item expected is url that host is domainName: ${domainName}!`);
            }
        }
    })

    const area = pushObjectCacheConfig.area;
    if (area && !isInArray(PUSH_OBJECT_CACHE_CONFIG_AREAS, area)) {
        errMsgs.push(`Pleas fill in pushObjectCacheConfig's area with ${PUSH_OBJECT_CACHE_CONFIG_AREAS.join("|")}`);
    }

    if (errMsgs.length > 0) {
        errMsgs.splice(0, 0, 'pushObjectCacheConfig validate fail items:\n');
    } else {
        SPINNER_VM.info('verify the validity of pushObjectCacheConfig success!');
    }
    SPINNER_VM.stop();
    return errMsgs;
}

export function sourcesValidate(sources: Array<SourceConfig>): Array<string> {
    SPINNER_VM.start('verifying the validity of sources');

    const errmsgs = []
    if (_.isEmpty(sources)) {
        errmsgs.push('sources is required!');
        SPINNER_VM.stop();
        return errmsgs;
    }

    if (!_.isArray(sources)) {
        errmsgs.push('sources expected is array.');
    }

    sources.forEach((i, index) => {
        index = index + 1
        if (!(i instanceof Object)) {
            errmsgs.push(`sources's NO.${index} item verify fail，sources's item expected is Object that contain type, content, port, priority, weight`);
        }

        const sourceType = i.type;
        if (!sourceType) {
            errmsgs.push(`sources's NO.${index} item verify fail，sources's type is required!`);
        }
        if (!isInArray(SOURCE_TYPES, sourceType)) {
            errmsgs.push(`sources's NO.${index} item verify fail，Pleas fill in sources's type with ${SOURCE_TYPES.join("|")}`);
        }

        const content = i.content;
        const indexOf = content.indexOf("//");
        if (indexOf + 1 == content.length -1) {
            errmsgs.push(`sources's NO.${index} item verify fail，sources's content is required!`);

        }
        i.content = content.substring(indexOf + 2);

        const sourcePort = i.port;
        if (sourcePort && !(typeof sourcePort == 'number')) {
            errmsgs.push(`sources's NO.${index} item verify fail，sources's port expected is number!`);
        }

        const sourcePriority = i.priority;
        if (sourcePriority && !isInArray(SOURCE_PRIORITIES, sourcePriority)) {
            errmsgs.push(`sources's NO.${index} item verify fail，Pleas fill in sources's priority with ${SOURCE_PRIORITIES.join("|")}`);
        }

        const sourceWeight = i.weight
        if (sourceWeight) {
            if (!(typeof sourceWeight == 'number')) {
                errmsgs.push(`sources's NO.${index} item verify fail，sources's weight expected is number!`);
            }

            if (sourceWeight > SOURCE_WEIGHT_MAX_VAL) {
                errmsgs.push(`sources's NO.${index} item verify fail，sources's weight expected is number that lesser than ${SOURCE_WEIGHT_MAX_VAL}!`);
            }
        }
    })

    if (errmsgs.length < 0) {
        SPINNER_VM.info('verify the validity of sources success!');
    }

    SPINNER_VM.stop();
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

/**
 * 是否需要帮助添加不存在的cdnDomain
 * @param deployFu 部署函数
 * @param inputs
 */
export async function askForAddFun(deployFu: Function, inputs: InputProps<CDNConfig>) {
    let autoCreate = inputs.props.autoCreate;

    if (!autoCreate) {
        const c = commandParse(inputs)

        // 通过参数选择是否自动创建不存在的cdnDomain
        autoCreate = c.data[AUTO_CREATE];

        // autoCreate=true 不存在，尝试是否存在 autoCreate形式
        if (!autoCreate) {
            const args = c.data['_'];
            if (!_.isEmpty(args)) {
                autoCreate = isInArray(args, AUTO_CREATE)
            }
        }
    }

    if (autoCreate) {
        await deployFu(inputs);
    }

    // 通过参数选择是否自动创建不存在的cdnDomain
    const {addCdnDomain} = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'addCdnDomain',
            message: 'Do you want to add the cdnDomain for you?'
        }
    ])
    if (addCdnDomain) {
        await deployFu(inputs);
    }
}

/**
 * 是否需要帮助开通cdn服务
 * @param openFu cdn客户端开通cdn服务函数
 */
export async function askForOpenCdnService(openFu: Function, inputs: InputProps<CDNConfig>) {

    let autoOpen = inputs.props.autoOpen;

    if (!autoOpen) {
        const c = commandParse(inputs);

        // 通过参数选择是否自动开通
        autoOpen = c.data[AUTO_OPEN];

        // autoOpen=true 不存在，尝试是否存在 autoOpen形式
        if (!autoOpen) {
            const args = c.data['_'];
            if (!_.isEmpty(args)) {
                autoOpen = isInArray(args, AUTO_OPEN);
            }
        }
    }

    if (autoOpen) {
        await openFu();
        return;
    }


    const {helpOpenCdnService} = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'helpOpenCdnService',
            message: 'Do you want to open the CdnService for you?'
        }
    ])
    if (helpOpenCdnService) {
        await openFu();
    } else {
        throw new CatchableError('the cdnService is not open, could not do any option');
    }
}

/**
 * 是否启用加速域名，在更新加速域名信息是，如果为启用，无法进行更新
 * @param startFu
 * @param inputs
 */
export async function askForStartCdnDomain(startFu: Function, inputs: InputProps<CDNConfig>) {
    const props = inputs.props;
    let autoStart = props.autoStart

    if (!autoStart) {
        const c = commandParse(inputs);

        // 通过参数选择是否自动开通
        c.data[AUTO_START];

        // autoStart=true 不存在，尝试是否存在 autoStart形式
        if (!autoStart) {
            const args = c.data['_'];
            if (!_.isEmpty(args)) {
                autoStart = isInArray(args, AUTO_OPEN);
            }
        }
    }

    if (autoStart) {
        await startFu(props.domainName, {waitUntilFinished: props.waitUntilFinished});
        return;
    }

    const {helpOpenCdnService: helpStartCdnDomain} = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'helpOpenCdnService',
            message: 'Do you want to start the cdnDomain for you?'
        }
    ])
    if (helpStartCdnDomain) {
        await startFu(props.domainName, {waitUntilFinished: props.waitUntilFinished});
    } else {
        throw new CatchableError('the cdnDomain is stopped, could not do any option');
    }
}

export async function wait(ms) {
    return new Promise((resolve => setTimeout(() => resolve(1), ms)));
}

export async function retry(maxWaitMs: number, fu: Function, interval: number = 10000) {
    let counter = 0;
    let res = null;
    do {
        await wait(interval);
        counter += interval;
        res = await fu();
    } while (!res && counter <= maxWaitMs);
    return res;
}

/**
 * 状态是否处于变更中
 * @param status
 */
export function isChanging(status: string): boolean {
    return status.includes('ing');
}

/**
 * 设置默认值
 * @param inputs
 */
function setDefaultVal(inputs: InputProps<CDNConfig>) {
    const props = inputs.props;

    if (typeof props.waitUntilFinished !== 'boolean') {
        props.waitUntilFinished = true;
    }

    if (props.waitUntilFinished && !props.maxWaitMs) {
        props.maxWaitMs = DEFAULT_MAX_WAIT_MS;
    }

    if (typeof props.refreshAfterDeploy !== 'boolean') {
        props.refreshAfterDeploy = true;
    }

    if (props.refreshAfterDeploy && (_.isEmpty(props.refreshConfig) || (_.isEmpty(props.refreshConfig.objectPaths)))) {
        props.refreshConfig = {
            objectPaths: [`http://${props.domainName}/`],
            objectType : 'Directory'
        }
    }

    if (typeof props.autoOpen !== 'boolean') {
        props.autoOpen = true;
    }

    if (typeof props.autoCreate !== 'boolean') {
        props.autoCreate = true;
    }

    if (typeof props.autoStart !== 'boolean') {
        props.autoStart = true;
    }
}

