"use strict";

/// 权限管理

/// 关于六大基本权限（按等级降序）
//! 全局权限覆盖局部权限
//! @root
//! 描述：根权限等级
//! 属性：bot载体的权限等级，唯一不可变
//! 作用域：全局
//! 权限：所有权限
//! @sa
//! 描述：超级管理员
//! 属性：bot持有者的权限等级，唯一确认，可转移
//! 作用域：全局
//! 权限：root之下的所有权限
//! @admin
//! 描述：管理员
//! 属性：群管理员默认权限等级，权限可由上级分配
//! 作用域：群
//! 权限：普通用户的所有权限，其他由权限配置文件决定
//! @user
//! 描述：普通用户
//! 属性：群成员与个人好友的默认权限等级，自动分配
//! 作用域：群成员的权限限定于群，个人好友权限为全局
//! 权限：插件所有可访问功能，由权限配置文件决定
//! @guest
//! 描述：访客
//! 属性：临时会话对象的默认权限等级，自动分配
//! 作用域：临时会话
//! 权限：插件可访问功能，由权限配置文件决定+

/// 关于权限应用对象
//! 1. 针对插件的权限管理
//! 插件权限配置插件功能的权限等级
//! 2. 针对用户的权限管理
//! 用户权限在插件权限的权限范围内约束权限

/// 关于权限组（弃用）
//! 权限组是派生自六大基本权限及的二次权限
//! 权限组继承基本权限的所有权限

/// 关于权限管理的作用域
//! @global 静态创建，动态更新，静态储存
//! @group 动态创建，动态更新，静态储存
//! @temporary 动态创建，动态更新，动态储存
//! 静态创建：权限配置在权限管理插件初始化时生成
//! 动态创建：权限配置在bot运行过程中生成，通常在新的服务启动时触发
//! 动态更新：权限配置在服务运行时根据实际情况进行实时更新
//! 静态储存：权限配置保存在本地配置文件，服务关闭或bot关机及其他必要情况写入配置文件
//! 动态储存：权限配置保存在运行时环境，服务关闭或bot关机时销毁

/// 关于权限的操作
//! .permission <op> [options...] [identifiers...]
//! .permission query <[scope:]uid> [plugin...] 权限查询
//! .permission set <plugin[.<sub-plugin]:(off|on)>... 插件权限管理
//! .permission reduce <[scope:]uid> <[scope:]permission-group> 权限下降
//! .permission lift <[scope:]uid> <[scope:]permission-group> 权限提升
//! .permission change <[scope:]uid> <plugin[.<sub-plugin>]:(off|on)> 变易目标对插件的访问权限
//! .permission shift <uid> 权限转移

const { clone } = require('lodash');

class PermissionUnit
{
	/// 基本权限单元
	//! PermissionUnit {
	//! 	<item>: {
	//! 		active: Boolean 整体有效性
	//! 		nodes: {
	//! 			<node>: (0禁用|1限制|2开放) 单项子权限
	//! 			<node>: ...,
	//! 			...
	//! 		}
	//! 	}
	//! 	<item>: ...,
	//! 	...
	//! }
	_permission;

	constructor()
	{
		this._permission = {};
	}

	get items()
	{
		return Object.keys(this._permission);
	}

	isActive(root)
	{
		return this._permission[root]?.active ?? false;
	}

	nodesOf(root)
	{
		return this._permission[root]?.nodes ?? {};
	}

	/// 新建权限项，默认置限制
	create(root, nodes, default_case = 1)
	{
		if (this._permission[root] == null)
		{
			this._permission[root] = { active: !!default_case, nodes: {} };
			if (nodes == null) return;
			let _root  = this._permission[root];
			let _nodes = Array.isArray(nodes) ? nodes : [nodes];
			_nodes.forEach((node) => {
				if (_root.nodes[node] == null)
				{
					_root.nodes[node] = default_case;
				}
			});
		}
	}

	/// 移除权限项
	remove(root, nodes)
	{
		if (this._permission[root] != null)
		{
			if (nodes == null)
			{
				delete this._permission[root];
				return;
			}
			let _root  = this._permission[root];
			let _nodes = Array.isArray(nodes) ? nodes : [nodes];
			_nodes.forEach((node) => {
				if (_root.nodes[node] != null)
				{
					delete _root.nodes[node];
				}
			});
		}
	}

	/// 权限设置（可选0禁用、1限制、2开放）
	set(root, nodes, default_case)
	{
		if (this._permission[root] != null)
		{
			let _root  = this._permission[root];
			let _nodes = nodes == null ? _root.nodes
				: (Array.isArray(nodes) ? nodes : [nodes]);
			_nodes.forEach((node) => {
				_root.nodes[node] = default_case;
			});
			_root.active = default_case != 0;
		}
	}

	/// 开启权限，默认置为开放（可选1限制、2开放）
	on(root, nodes, default_case = 2)
	{
		if (this._permission[root] != null)
		{
			let _root = this._permission[root];
			_root.active = true;
			if (nodes == null)
			{	//! 未给定节点，开启全部权限
				for (let node in _root.nodes)
				{
					let level = _root.nodes[node] ?? default_case;
					_root.nodes[node] = Math.max(level, default_case);
				}
			} else
			{
				let _nodes = Array.isArray(nodes) ? nodes : [nodes];
				_nodes.forEach((node) => {
					let level = _root.nodes[node] ?? default_case;
					_root.nodes[node] = Math.max(level, default_case);
				});
			}
		}
	}

	/// 禁用权限，默认置为禁用（可选0禁用、1限制）
	off(root, nodes, default_case = 0)
	{
		if (this._permission[root] != null)
		{
			let _root = this._permission[root];
			if (nodes == null)
			{	//! 为给定节点，禁用权限项
				_root.active = false;
			} else
			{
				let _nodes = Array.isArray(nodes) ? nodes : [nodes];
				_nodes.forEach((node) => { _root[nodes] = default_case; });
			}
		}
	}

	/// 查询权限等级
	//! @return: -1非法、0禁用、1限制、2开放
	query(root, node = null)
	{
		let _root = this._permission[root];
		if (_root == null) return -1;

		//! 若active置false，则否决所有权限
		if (_root.active == false) return 0;

		if (node == null)
		{	//! 未指定权限节点，则查询节点的最高权限等级（0为最高等级）
			return Math.min(...Object.values(_root.nodes));
		} else
		{	//! 若active置true，则查询子节点权限等级
			//! 权限节点不存在默认为持有1限制级权限
			return _root.nodes[node] ?? 1;
		}
	}

	setItem(root, item)
	{
		if (!root || !item) return false;
		this._permission[root] = {
			active: item.active,
			nodes:  clone(item.nodes)
		};
	}

	/// 将约束权限合并应用于权限项
	//! @param: root: String
	//! @param: item: PermissionUnit.node
	//! @param: restriction: PermissionUnit
	//! @return: PermissionUnit.node
	static compoundItem(root, item, restriction)
	{
		let _item = {
			active: item.active,
			nodes:  clone(item.nodes)
		};
		let _restriction = restriction[root];

		if (_restriction != null)
		{
			_item.active = _restriction.active;
			if (_item.active)
			{
				let _nodes = _restriction.nodes;
				for (let node in _nodes)
				{
					let level = _item.nodes[node] ?? _nodes[node];
					_item.nodes[node] = Math.min(level, _nodes[node]);
				}
			}
		}

		return _item;
	}
};

class Permission
{
	_permission;

	constructor(root, sa)
	{
		if (!root) throw new Error('MelaiiBot@Permission: request root user');
		this._permission = { root };
		if (!!sa) this._permission.sa = sa;

		/// 域权限
		//! FieldPermission {
		//! 	fid: String 域编码
		//! 	permission: PermissionUnit
		//! }

		/// 用户权限
		//! UserPermission {
		//! 	user_id: String 用户ID
		//! 	cpl: Number 权限等级
		//! 	active: Boolean 权限有效性
		//! 	permission: PermissionUnit | Null 权限单元，置Null缺省为所在域权限
		//! }

		//! global集包含权限组admin与user
		//! root与sa与admin、user一同包含在global域中
		this._permission.global    = [/*UserPermission...*/];

		//! local集包含权限组admin与user
		this._permission.local     = {/*scope: [UserPermission...], ...*/};

		//! temporary集包含权限组guest
		this._permission.temporary = [/*user_id*/];

		//! 域权限
		this._item_permissions = {/*field: PermissionUnit, ...*/};
	}

	get root()      { return this._permission.root;      }
	get sa()        { return this._permission.sa;        }
	get global()    { return this._permission.global;    }
	get local()     { return this._permission.local;     }
	get temporary() { return this._permission.temporary; }

	/// 判断local集是否包含scope域
	hasLocalScope(scope)
	{
		if (!scope) return false;
		return Object.keys(this.local).includes(scope);
	}

	/// 判断域是否存在
	hasScope(scope)
	{
		if (!scope) return false;
		return scope == 'global' || scope == 'temporary'
			|| this.hasLocalScope(scope);
	}

	/// 获取域权限
	getScopePermission(scope)
	{
		let ipus = this._item_permissions;
		if (Object.keys(ipus).includes(scope))
		{
			return ipus[scope];
		}
		return null;
	}

	/// 获取用户项
	getUserItem(user_id, scope)
	{
		if (!this.hasScope(scope)) return null;

		let cpl = this.getCPL(user_id, scope);

		//! 用户对象不存在
		if (cpl == -1) return null;

		//! root/sa权限组用户
		if (cpl <= 1) return user_id;

		if (scope == 'temporary')
		{
			return this.temporary.find((e) => e == user_id);
		}

		let field = scope == 'global' ? this.global : this.local[scope];
		if (field == null) return null;

		return field.find((e) => e.user_id == user_id);

	}

	/// 获取当前权限等级
	//! @param: scope: "global": 预设域，包含root、sa、global集
	//! @param: scope: "temporary": 预设域，包含temporary集
	//! @param: scope: ...: 其他local集包含的域
	//! @return: -1 - invalid
	//! @return:  0 - root
	//! @return:  1 - sa
	//! @return:  2 - admin
	//! @return:  3 - user
	//! @return:  4 - guest
	getCPL(user_id, scope = null)
	{
		if (user_id == this._permission.root) return 0;
		if (user_id == this._permission.sa)   return 1;

		let result;

		result = this.global.find((e) => e.user_id == user_id);
		if (result != null) return result.cpl;

		if (scope == 'global') return -1; //! global域不包含对象

		if (scope != 'temporary' && this.hasLocalScope(scope))
		{
			result = this.local[scope].find((e) => e.user_id == user_id);
			if (result != null) return result.cpl;
		}

		if (this.temporary.includes(user_id))
		{
			if (scope == null || scope == 'temporary')
			{
				return 4;
			}
		}

		return -1;
	}

	/// local集新建scope域
	createLocalScope(scope)
	{
		if (!this.hasLocalScope(scope)
			&& !['global', 'temporary'].includes(scope))
		{
			this.local[scope] = [];
			return true;
		}
		return false;
	}

	/// local集移除scope域
	removeLocalScope(scope)
	{
		if (this.hasLocalScope(scope))
		{
			delete this.local[scope];
			return true;
		}
		return false;
	}

	/// 弹出用户
	popUser(user_id, scope)
	{
		if (!user_id || !scope) return null;

		let cpl = this.getCPL(user_id, scope);
		if (cpl <= 1) return null;

		let index, field;
		switch (scope)
		{
			case 'global':
				field = this.global;
				index = field.findIndex((e) => user_id == e.user_id);
			break;
			case 'temporary':
				field = this.temporary;
				index = field.indexOf(user_id);
			break;
			default:
				field = this.local[scope];
				index = field.findIndex((e) => user_id == e.user_id);
			break;
		}
		return field.splice(index, 1)[0];
	}

	/// 压入用户
	//! @param: ele: UserPermissionUnit
	//! @note: 用户已存在时，若权限等级高于目标则覆盖，否则跳过
	pushUser(ele, scope)
	{
		if (!ele || !this.hasScope(scope)) return false;

		let cpl = this.getCPL(ele.user_id, scope);

		if (cpl == -1 || ele.cpl < cpl)
		{
			if (scope == 'temporary') return false;
			let field = scope == 'global' ? this.global : this.local[scope];
			let index = field.findIndex((e) => e.user_id == ele.user_id);
			if (index == -1)
			{
				field.push(ele);
			} else
			{
				field[index] = ele;
			}
			return true;
		}

		return false;
	}

	/// temporary集添加guest用户
	addGuest(user_id)
	{
		if (!user_id) return false;
		if (!this.temporary.includes(user_id))
		{
			this.temporary.push(user_id);
			return true;
		}
		return false;
	}

	/// temporary集移除guest用户
	delGuest(user_id)
	{
		if (!user_id) return false;
		let index = this.temporary.indexOf(user_id);
		if (index != -1)
		{
			this.temporary.splice(index, 1);
			return true;
		}
		return false;
	}

	/// 添加user用户
	addUser(user_id, scope)
	{
		if (!scope || scope == 'temporary') return false;
		if (!this.hasScope(scope)) return false;

		let field = scope == 'global' ? this.global : this.local[scope];
		let cpl = this.getCPL(user_id, scope);

		if (cpl == -1) cpl = this.getCPL(user_id, 'temporary');

		if (cpl == -1)
		{	//! 用户不存在，添加为user
			field.push({ user_id, cpl: 3, permission: null });
			return true;
		}

		if (cpl == 4)
		{	//! 用户为guest，提升为user
			this.delGuest(user_id);
			field.push({ user_id, cpl: 3, permission: null });
			return true;
		}

		return false;
	}

	/// 权限请求状态码
	static code2msg(code)
	{
		const _ = {
			0: '请求完成',
			1: '无效请求，缺失权限代码',
			2: '不允许的操作',
			3: '权限不足',
			4: '操作不会改变目标数据，忽略请求',
			5: '待操作用户目标不存在',
			6: '操作用户目标不存在',
			7: '权限对象目标不存在',
			8: '域不存在'
		};
		return _[code] ?? '无效的状态码';
	}

	/// 权限提升
	//! 操作者允许将低等级权限提升至不高于自己下一级的权限组
	//! 有效的操作权限组为root/sa/admin
	//! local集权限的操作者只允许本域的权限提升
	//! 跨域及local集到global域的提升只允许root/sa与global域的admin操作
	//! 可用的权限提升路线为guest→user→admin，每次权限提升只一级
	//! 权限提升后将在原来的基础上按配置消除无权访问标签
	liftCPL(user_id, scope, to_scope, operator, op_scope)
	{
		//! 缺失权限代码
		if (operator == null) return 1;

		let user_cpl = this.getCPL(user_id, scope);
		let op_cpl   = this.getCPL(operator, op_scope);

		//! 待操作用户不存在
		if (user_cpl == -1) return 5;

		//! 操作用户不存在
		if (op_cpl == -1) return 6;

		//! 试图提升root/sa组权限，拒绝操作
		if (user_cpl <= 1) return 2;

		//! 提升的目标域不存在
		if (!this.hasScope(to_scope)) return 8;

		//! 拒绝权限提升至temporary域
		if (to_scope == 'temporary') return 2;

		//! 拒绝将global域权限提升在非global域中
		if (scope == 'global' && to_scope != 'global') return 2;

		//! 权限不足
		if (op_cpl > 2 || user_cpl - 1 <= op_cpl) return 3;

		/// 允许的操作
		//! root/sa
		//! 	guest->user
		//! 	user->admin
		//! global:admin
		//! 	guest->user
		//! local:admin
		//! 	guest->local:user

		/// root/sa/global:admin
		if (op_scope == 'global')
		{
			if (scope == 'temporary')
			{	//! guest->user
				return this.addUser(user_id, to_scope) ? 0 : 2;
			} else
			{	//! user->admin
				let ele    = this.popUser(user_id, scope); //! 必定不为null
				ele.cpl    = 2;    //! 提升为admin
				ele.active = true; //! 恢复活跃状态
				if (ele.permission != null)
				{
					ele.permission.items.forEach((item) => {
						ele.permission.on(item, null, 1);
					});
				}
				this.pushUser(ele, scope);
				return 0;
			}
		}

		/// local:admin
		//! 拒绝非temporary集的跨域请求
		if (scope != 'temporary' && (scope != to_scope || scope != op_scope)) return 3;

		//! guest->local:user
		return this.addUser(user_id, to_scope) ? 0 : 2;
	}

	/// 权限下降
	//! 操作者影具有root/sa/admin权限
	//! 操作者允许将被操作者在同域内下降一个权限等级
	//! root/sa无法被执行权限下降，root对sa的权限下降应当通过权限转移执行
	//! 下降admin权限时，admin目标置为user并
	//! user权限不再下降为guest
	//! 下降local集的user权限时，禁用目标全部权限
	//! 下降global集的user权限时，目标直接清除
	reduceCPL(user_id, scope, operator, op_scope)
	{
		//! 缺失权限代码
		if (operator == null) return 1;

		let user_cpl = this.getCPL(user_id, scope);
		let op_cpl   = this.getCPL(operator, op_scope);

		//! 待操作用户不存在
		if (user_cpl == -1) return 5;

		//! 操作用户不存在
		if (op_cpl == -1) return 6;

		//! 试图下降root/sa组权限，拒绝操作
		if (user_cpl <= 1) return 2;

		//! 拒绝下降temporary域权限组权限
		if (scope == 'temporary') return 2;

		//! 权限不足
		if (op_cpl > 2 || user_cpl - 1 <= op_cpl) return 3;
		if (scope == 'global' && op_scope != 'global') return 3;

		//! 拒绝local:admin跨域请求，权限不足
		if (op_cpl == 2 && scope != op_scope) return 3;

		let ele = this.popUser(user_id, scope);
		if (scope == 'global' && user_cpl == 3)
		{	//! global:user->null
		} else if (scope == 'global' && user_cpl == 2)
		{	//! global:admin->global:user
			ele.cpl = 3; //! 下降为user
			if (this._item_permissions[scope] != null)
			{	//! 依据域权限下降对象权限等级
				let items = ele.permission.items;
				for (let root in items)
				{
					ele.permission.setItem(root,
					PermissionUnit.compoundItem(root, {
						active: ele.permission.isActive(root),
						nodes: ele.permission.nodesOf(root)
					}, this._item_permissions[scope]));
				}
			} else
			{	//! 域权限不存在，所有权限降为至少限制
				ele.permission.items.forEach((item) => {
					ele.permission.off(item, ele.permission.nodesOf(item), 1);
				});
			}
			this.pushUser(ele);
		} else
		{	//! local:user->...
			ele.active = false;
			this.pushUser(ele);
		}

		//! reduce请求完成
		return 0;
	}

	/// 权限转移
	//! 操作者应具有root/sa权限
	//! 跨域权限转移应请求root权限
	//! sa执行权限转移时，应提升为root权限
	//! 存在一方的域为temporary时，请求将被拒绝
	shiftCPL(from_user, from_scope,
			 to_user,   to_scope,
			 operator,  op_scope)
	{
		//! 缺失权限代码
		if (operator == null) return 1;

		//! shift操作同一对象，忽略请求
		if (from_user == to_user && from_scope == to_scope) return 4;

		let from_cpl = this.getCPL(from_user, from_scope);
		let to_cpl   = this.getCPL(to_user, to_scope);

		//! 待操作用户不存在
		if (from_cpl == -1 || to_cpl == -1) return 5;

		//! 拒绝对root修改
		if (from_cpl == 0) return 2;

		let op_cpl = this.getCPL(operator, op_scope);

		//! 操作用户不存在
		if (op_cpl == -1) return 5;

		//! shift请求只允许root/sa权限组，当前权限不足
		if (op_cpl != 0 && op_cpl != 1) return 3;

		//! shift请求拒绝对temporary域的操作
		if (from_scope == 'temporary' || to_scope == 'temporary') return 2;

		//! 转移sa权限应提升为root权限组，当前权限不足
		if (from_cpl == 1 && op_cpl == 1) return 3;

		//! 跨域shift要求root请求，当前权限不足
		if (from_scope != to_scope && op_cpl != 0) return 3;

		//! 执行转移覆盖，被转移用户将降为初始user权限
		let pp, pi, pq, pj;

		pp = from_scope == 'global' ? this.global : this.local[from_scope];
		pq = to_scope   == 'global' ? this.global : this.local[to_scope];
		pi = pp.findIndex((e) => e.user_id == from_user);
		pj = pq.findIndex((e) => e.user_id == to_user);

		pq[pj] = pp[pi];
		pp[pi] = { user_id: from_user, cpl: 3, permission: null };

		//! shift请求完成
		return 0;
	}

	/// 查询是否存在权限项
	hasPermissionItem(root, node, scope)
	{
		let fpu_g = this.getScopePermission('global');
		let fpu   = this.getScopePermission(scope);

		if (!fpu && !fpu_g) return false;

		let has_root_g = fpu_g == null ? false : fpu_g.items.includes(root);
		let has_root   = fpu   == null ? false : fpu.items.includes(root);

		if (!has_root_g && !has_root) return false;

		if (node == null) return has_root_g || has_root;

		let has_node_g = has_root_g
			? Object.keys(fpu_g.nodesOf(root)).includes(node) : false;

		let has_node = has_root
			? Object.keys(fpu.nodesOf(root)).includes(node) : false;

		return has_node_g || has_node;
	}

	/// 目标项权限设置
	//! @param: item: { root: 目标根名称, nodes: 目标子节点, level: 设置等级（0|1|2） }
	//! @param: target: { user_id: 目标名称, scope: 域 }
	setPermission(item, target, operator, op_scope)
	{
		//! 缺失权限代码
		if (operator == null) return 1;

		let _op_cpl = this.getCPL(operator, op_scope);

		//! 操作用户目标不存在
		if (_op_cpl == -1) return 6;

		//! 要求root/sa/admin权限组，权限不足
		if (_op_cpl > 2) return 3;

		let _root  = item?.root;
		let _nodes = item?.nodes == null ? null
				: (Array.isArray(item.nodes) ? item.nodes : [item.nodes]);
		let _level = item?.level ?? 1;

		//! 缺失请求的对象目标
		if (_root == null) return 7;

		let _scope   = target?.scope ?? 'global';
		let _user_id = target?.user_id;
		let _cpl     = this.getCPL(_user_id, _scope);

		//! 操作对象目标域不存在
		if (!this.hasScope(_scope)) return 8;

		//! 待操作用户目标不存在
		if (_user_id != null && _cpl == -1) return 6;

		//! 请求操作同级及以上权限组，权限不足
		if (_cpl != -1 && _cpl <= _op_cpl) return 3;

		//! 请求单独设置temporary集guest的权限，拒绝请求
		if (_cpl == 4) return 2;

		if (_cpl != -1)
		{	//! 设置目标用户权限
			let user_item = this.popUser(_user_id, _scope);

			//! 尝试操作root/sa权限组
			if (user_item == null) return 2;

			if (user_item.permission == null)
			{	//! 独立权限不存在，补充创建
				user_item.permission = new PermissionUnit;
			}

			let fpu = this._item_permissions[_scope];
			let ipu = user_item.permission;

			if (!ipu.items.includes(_root))
			{	//! 对象不存在，根据域约束创建
				if (fpu != null)
				{	//! 域约束存在，应用约束
					ipu.setItem(_root,
					PermissionUnit.compoundItem(_root, {
						active: ipu.isActive(_root),
						nodes: ipu.nodesOf(_root)
					}, fpu));
				} else
				{	//! 域约束不存在，补充创建权限对象
					ipu.create(_root, _nodes, level);
				}
			}

			if (level == 0)
			{	//! 禁用级
				ipu.off(_root, _nodes, level);
			} else
			{	//! 抑制/开放级
				ipu.on(_root, _nodes, level);
			}

			return this.pushUser(user_item, _scope) ? 0 : 2;
		} else
		{	//! 设置域权限
			if (this._item_permissions[_scope] == null)
			{
				this._item_permissions[_scope] = new PermissionUnit;
			}
		
			let ipu = this._item_permissions[_scope];
		
			if (!ipu.items.includes(_root))
			{
				ipu.create(_root, _nodes, _level);
			} else
			{
				ipu.set(_root, _nodes, _level);
			}
		
			return 0;
		}
	}

	//! 判定权限项是否有效
	//! 若权限项不存在则默认无效
	isActive(root, scope)
	{
		let fpu_g = this.getScopePermission('global');
		let fpu   = this.getScopePermission(scope);

		let result_g = true;
		let result   = false;

		if (fpu_g != null)
		{
			result_g = fpu_g.isActive(root);
		}

		if (fpu != null)
		{
			result = fpu.isActive(root);
		}

		return result_g && result;
	}

	/// 用户权限测试，判定目标是否持有权限
	//! root/sa对PermissionUnit的禁用级及以上持有权限
	//! admin对PermissionUnit的限制级及以上持有权限
	//! user/guest对PermissionUnit的开放级及以上持有权限
	//! 权限额外服从域约束与active标志
	cplTest(root, node, user_id, scope)
	{
		//! 要求对象
		if (!root) return false;

		let cpl = this.getCPL(user_id, scope);

		//! 请求者不存在
		if (cpl == -1) return false;

		//! root/sa持有全部权限
		if (cpl <= 1) return true;

		/// 测试规则
		//! 1. 全局权限覆盖局部权限
		//! 2. 若域权限存在，则作为约束，否则忽略
		//! 3. 域权限与用户独立权限皆不存在，默认为权限等级1限制
		//! 4. 全局与局部同时存在，有效性同时生效

		//! 至少存在一个
		let user_g = this.getUserItem(user_id, 'global');
		let user   = this.getUserItem(user_id, scope);

		//! 用户无效
		if (!(user_g?.active ?? true)) return false;
		if (!(user?.active   ?? true)) return false;

		let fpu_g      = this.getScopePermission('global');
		let fpu        = this.getScopePermission(scope);
		let fpu_result = null;

		//! 权限项无效
		if (!this.isActive(root, scope)) return false;

		if (fpu_g != null)
		{
			fpu_result = fpu_g.query(root, node);
		} else if (fpu != null)
		{
			fpu_result = fpu.query(root, node);
		}

		let ipu_g      = user_g?.permission;
		let ipu        = user?.permission;
		let ipu_result = 1; //! 限制级权限

		if (ipu_g != null)
		{
			ipu_result = ipu_g.query(root, node);
		} else if (ipu != null)
		{
			ipu_result = ipu.query(root, node);
		}

		let level = fpu_result == null
			? ipu_result
			: Math.min(fpu_result, ipu_result);

		switch (level)
		{
			case 0: //! 禁用
				return cpl <= 1; //! root/sa
			case 1: //! 限制
				return cpl == 2; //! admin
			case 2: //! 开放
				return true;     //! user/guest
			default:
				return false;    //! ERROR
		}
	}
};

module.exports = 
{
	PermissionUnit,
	Permission
};