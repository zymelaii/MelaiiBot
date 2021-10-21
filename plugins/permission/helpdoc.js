"use strict";

HELP_ALL =
`Usage: .permission <allow|ban> <Plugin> [Options]
Intro: 权限管理
SubCommand:
    allow: 赋予对象权限
    ban: 取消对象权限
Options:
    -u, --user: 指定用户ID
    -g, --group: 指定群组ID
    -w, --whitelist: 应用白名单模式
    -b, --blacklist: 应用黑名单模式
Note: 黑名单模式为默认模式`;

module.exports =
{
	HELP_ALL
};