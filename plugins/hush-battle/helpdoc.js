const HELP_ALL =
`Usage: .hush-battle <SubCommand> [Options...]
Intro: Hush Battle 小游戏
SubCommand:
    help: 查看当前帮助信息
    init: 初始化服务器
    list: 罗列相关信息
    view: 查看玩家属性
    login: 本地玩家登录
    logout: 本地玩家下线
    join: 加入Hush Battle场景
    PVE: 详情请见 .hush-battle PVE -h
    PVP: 详情请见 .hush-battle PVP -h`;

const HELP_INIT =
`Usage: .hush-battle init [Options...]
Intro: 初始化服务器
Options:
    -h, --help: 显示当前帮助信息
    -f, --force: 无论服务器是否已经存在，都强制执行初始化（要求管理员权限）
Note: 初始化将为所有成员建立玩家信息`;

const HELP_LIST =
`Usage: .hush-battle list <server|role> [Options...]
Intro: 罗列相关信息
Options:
    -h, --help: 显示当前帮助信息
Note: 若罗列目标未给出，list将自动选择server`;

const HELP_VIEW =
`Usage: .hush-battle view <uid> [Options...]
Intro: 查看玩家属性
Options:
    -h, --help: 显示当前帮助信息
    -m, --more: 显示详细属性
Note: 若玩家编号未指定，view将自动选择当前玩家`;

const HELP_LOGIN =
`Usage: .hush-battle login
Intro: 本地玩家登录`;

const HELP_LOGOUT =
`Usage: .hush-battle login
Intro: 本地玩家下线`;

const HELP_JOIN =
`Usage: .hush-battle join [Options...]
Intro: 加入Hush Battle场景
Note: 本功能尚未开放`;

const HELP_PVE =
`Usage: .hush-battle PVE [Options...]
Note: 本功能尚未开放`;

const HELP_PVP =
`Usage: .hush-battle PVP [Options...]
Note: 本功能尚未开放`;

module.exports =
{
	HELP_ALL,
	HELP_INIT,
	HELP_LIST,
	HELP_VIEW,
    HELP_LOGIN,
    HELP_LOGOUT,
    HELP_PVE,
    HELP_PVP
};