export const MINIMIST_HELP_OPT = {
    boolean: ['help'],
    alias: {help: 'h'},
};

export const CDN_TYPES = ['web', 'download', 'video'];
export const SOURCE_TYPES = ['ipaddr', 'domain', 'oss', 'fc_domain'];
export const SOURCE_PRIORITIES = [20, 30];
export const SOURCE_WEIGHT_MAX_VAL = 100;
export const SCOPES = ['domestic', 'overseas', 'global'];
export const REFRESH_CONFIG_OBJECT_TYPES = ['File', 'Directory', 'Regex'];
export const PUSH_OBJECT_CACHE_CONFIG_AREAS = ['domestic', 'overseas'];
export const HELP_INFO = [
    {
        header: 'CDN Component',
        content: 'Help you deploy、start、stop、remove cnd domain and refresh object caches、push object cache'
    },
    {
        header: 'Commands',
        content: [
            {
                name: 'deploy',
                summary: 'Help you create or update the cdn domain. required props: cdnType、domainName、sources.'
            },
            {
                name: 'start',
                summary: 'Help you start the cdn domain. required props: cdnType、domainName、sources.'
            },
            {
                name: 'stop',
                summary: 'Help you stop the cdn domain. required props: cdnType、domainName、sources.'
            },
            {
                name: 'remove',
                summary: 'Help you remove the cdn domain. required props: cdnType、domainName、sources.'
            },
            {
                name: 'refresh',
                summary: 'Help you refresh object caches. required props: cdnType、domainName、sources、refreshConfig.'
            },
            {
                name: 'warmUp',
                summary: 'Help you push object cache. required props: cdnType、domainName、sources、pushObjectCacheConfig.'
            },
        ]
    }
];
export const AUTO_OPEN = 'autoOpen';
export const AUTO_CREATE = 'autoCreate';
export const AUTO_START = 'autoStart';

export const DEFAULT_MAX_WAIT_MS = 420000;
