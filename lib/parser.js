"use strict";

const fs = require('fs');
const { cloneDeep } = require('lodash');

const defaultCmdDesc =
{
	style: 'gnu', //! UNUSED
	cmd: null,
	subcmd: [ //! 若存在，写入单一子命令
		// {
		// 	keyword: string
		// 	collect: number
		//  accept: 'all' | 'word' | 'option'
		// }
	],
	options: {
		keywords: [
			{
				id: 0,
				op: { short: 'h', long: 'help' },
				collect: 0,
				check: () => true,
				help: 'display this information'
			}
		],
		conflicts: {} //! UNUSED
	},
	config: {
		ignore: {
			unknown: false,    //! 未知的参数 → 跳过并写入freewords
			bad_option: false, //! 子参数检查不通过 → 忽略检查并写入
			bad_collect: true, //! 实际子参数数量小于预期 → 将剩余子参数填充为null
			case: false,       //! 大小写敏感 → 忽略大小写
			repeated: false,   //! 同参数重复出现 → 采取第一项并忽略之后的相同参数
		}
	}
};

function getdesctemp(cmd)
{
	var description = defaultCmdDesc;
	description.cmd = String(cmd);
	return description;
}

function desc2json(desc)
{
	var tmp = cloneDeep(desc);

	let keywords = tmp.options.keywords;
	for (let i in keywords)
	{
		let fnstr = keywords[i].check.toString();
		if (typeof(eval(fnstr)) != 'function')
		{
			console.warn(
				'[WARN] desc2json:',
				'unrecognized check function has been replaced by () => true');
			fnstr = '() => true';
		}
		keywords[i].check = fnstr;
	}

	return JSON.stringify(tmp, null, 4);
}

function fixdesc(json)
{
	let desc = cloneDeep(json);

	let keywords = desc.options.keywords;
	for (let i in keywords)
	{
		var fncheck = eval(keywords[i].check);
		if (typeof(fncheck) != 'function')
		{
			console.warn(
				'[WARN] json2desc:',
				'unrecognized check function has been replaced by () => true');
			fncheck = () => true;
		}
		keywords[i].check = fncheck;
	}

	return desc;
}

function json2desc(json)
{
	return fixdesc(JSON.parse(json));
}

function compoundHelpInfo(description)
{
	let infopage = '';

	if (description.cmd)
	{
		infopage += description.cmd + ': ';
	}
	infopage += 'Usage:';

	const options = description.options.keywords;
	for (let i in options)
	{
		const e = options[i];

		let line;
		if (e.op.short && !e.op.long)
		{
			line = '-' + e.op.short;
		} else if (e.op.long && !e.op.short)
		{
			line = '--' + e.op.long;
		} else
		{
			line = '-' + e.op.short + ', '
				+ '--' + e.op.long;
		}
		line = (line + ':').padEnd(16);
		infopage += '\n    ' + line + e.help;
	}

	return infopage;
}

function preparse(cmdline)
{
	let words = cmdline.trim().split('');
	let argv = [];

	let matched_quote = true;
	let i = 0;

	while (i < words.length)
	{
		while (words[i].trim() == '' && i < words.length) ++i;

		let word = '';
		while (i < words.length)
		{
			if (words[i].trim() == '') break;

			word += words[i];

			if (words[i] == '"')
			{
				matched_quote = false;

				while (++i < words.length)
				{
					word += words[i];
					if (words[i] == '"')
					{
						matched_quote = true;
						break;
					}
				}

				break;
			}

			++i;
		}

		if (!matched_quote) return null;
		if (word != '') argv.push(word);

		++i;
	}

	argv = argv.filter((e) => e != '""').map((e) => {
		if (e.slice(0, 1) == '"' && e.slice(-1) == '"')
		{
			return e.slice(1, -1);
		} else
		{
			return e;
		}
	});

	// console.log('[INFO] parsed command elements:', argv);

	var cmd = argv.splice(0, 1)[0];

	return [cmd, argv];
}

function collect(args, index, keywordDesc, ignore)
{	//! args[index].type == 0
	const option = ['', '-', '--'][args[index - 1].type] + args[index - 1].word;
	const check = keywordDesc.check == null ? () => true : keywordDesc.check;
	const len = args.length;

	let collect_left = keywordDesc.collect;
	let i = index, j = 0;

	var subargs = new Array(collect_left);
	while (i < len && args[i].type == 0)
	{
		if (collect_left == 0) break;

		if (ignore.bad_option || check(args[i].word))
		{
			subargs[j++] = args[i].word;
			--collect_left;
		} else
		{
			throw new Error(
				`bad sub-option "${args[i].word}" of "${option}"`);
		}

		i += 1;
	}

	if (collect_left > 0 && !ignore.bad_collect)
	{
		throw new Error(
			`option "${option}" requests ${collect_left} more sub-options`);
	}

	return [subargs, keywordDesc.collect - collect_left];
}

function parse(args, description)
{
	const keywords = description.options.keywords;
	const ignore = description.config.ignore;

	args = args.map((e) => {
		let t;
		if (e.slice(0, 2) == '--') t = 2; //! long  option
		else if (e[0] == '-') t = 1;      //! short option
		else t = 0;                       //! free  word
		const _word = e.slice(t);
		return {
			word: _word,
			word2: ignore.case ? _word.toLowerCase() : _word,
			type: t
		};
	});

	var argElements = {};
	var subCmd      = {};
	var freeWords   = [];

	var i = 0, j, index = 0;
	while (i < args.length)
	{
		let word = args[i];
		if (word.type == 0)
		{
			freeWords.push({ index: index++, word: word.word });
			++i;
			continue;
		}

		const prefix = ['-', '--'][args[i].type - 1];
		const key = ['short', 'long'][word.type - 1];
		const option = prefix + word.word2;

		const err_unknown = new Error(
			`unknown ${key} option: "${option}"`);
		const err_repeated = new Error(
			`option "${option}" appears one more times`);

		j = keywords.findIndex((e) => word.word2 == e.op[key]);
		if (j != -1)
		{
			const key = keywords[j].op.long == null ? keywords[j].op.short : keywords[j].op.long;
			var [subargs, count] = collect(args, i + 1, keywords[j], ignore);
			if (argElements[key] != null && !ignore.repeated) throw err_repeated;
			else argElements[key] = { index: index++, args: subargs };
			i += count;
		} else
		{
			if (ignore.unknown) freeWords.push({ index: index++, word: prefix + word.word });
			else throw err_unknown;
		}

		i += 1;
	}

	if (freeWords.length > 0 && freeWords[0].index == 0)
	{
		let word = freeWords[0].word;
		let target = description.subcmd.find((e) => e.keyword == word);

		if (target != null)
		{
			let tmpwords;

			let e1 = freeWords.slice(1).map((e) => {
				return { index: e.index, ele: e.word };
			});

			let e2 = Object.keys(argElements).map((e) => {
				return {
					index: argElements[e].index,
					ele: {
						key: e,
						args: argElements[e].args
					}
				};
			});

			switch (target.accept)
			{
				case 'word':   tmpwords = e1; break;
				case 'option': tmpwords = e2; break;
				case 'all':    tmpwords = e1.concat(e2).sort((a, b) => a.index - b.index); break;
				default: throw Error('unknown subcmd accept type');
			}

			subCmd.keyword = target.keyword;
			subCmd.args = new Array(target.collect);

			let tmpargs = tmpwords.slice(0, target.collect);

			if (tmpargs.length == target.collect)
			{
				for (i = 0; i < tmpargs.length; ++i)
				{
					if (tmpargs[i].index == i + 1)
					{
						subCmd.args[i] = tmpargs[i];
					}
				}

				let null_count = subCmd.args.filter((e) => e == null).length;
				if (null_count && !ignore.bad_collect)
				{
					throw new Error(
						`subcmd "${target.keyword}" requests ${null_count} more arguments`);
				}

				let finalIndex = subCmd.args.filter((e) => e != null).length;

				for (i = 0; i < freeWords.length; ++i)
				{
					if (freeWords[i].index <= finalIndex)
					{
						delete freeWords[i];
					} else
					{
						freeWords[i].index -= finalIndex + 1;
					}
				}
				freeWords = freeWords.filter((e) => e != null);

				let optionkeys = Object.keys(argElements);
				for (i = 0; i < optionkeys.length; ++i)
				{
					if (argElements[optionkeys[i]].index <= finalIndex)
					{
						delete argElements[optionkeys[i]];
					} else
					{
						argElements[optionkeys[i]].index -= finalIndex + 1;
					}
				}

				var words = [];
				var suboptions = {};
				subCmd.args = subCmd.args.map((e) => e.ele);
				subCmd.args.forEach((e) => {
					if (typeof(e) == 'string') words.push(e);
					else suboptions[e.key] = e.args.length == 0 ? true : e.args;
				});
				subCmd.args = suboptions;
				subCmd.args._ = words.slice(0);
			}
		}
	}

	return [subCmd, argElements, freeWords];
}

async function execute(raw_command, description, perform)
{
	const [cmd, args] = preparse(raw_command);
	if (cmd != description.cmd) return null;
	const [subCmd, argElements, freeWords] = parse(args, description);
	return await perform(subCmd, argElements, freeWords);
}

module.exports =
{
	getdesctemp,      //! 获取指令描述档案模板
	desc2json,        //! 指令描述档案转Json字符串
	fixdesc,          //! 修复指令描述档案
	json2desc,        //! Json字符串转指令描述档案
	compoundHelpInfo, //! 从指令描述档案复合得到帮助文档
	preparse,         //! 原始命令行划词分割
	parse,            //! 从命令划词解析获取命令词组
	execute,          //! 从命令词组执行目标命令
};