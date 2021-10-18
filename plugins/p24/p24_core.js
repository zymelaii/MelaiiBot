"use strict"

const path = require('path');
const { execSync } = require('child_process');
const { evaluate } = require('mathjs');

function calc24(target, nums)
{   //@ p24-calc.cpp
    var results = execSync(
        path.resolve('./bin/p24-calc') + ' '
        + [...nums, target].join(' ')).toString().split('\n');
    results = [...new Set(results.map(e => e.trim()).filter(e => e != ''))]
    return results;
}

function gen24(target)
{   //@ p24-gen.cpp
    var results = execSync(
        path.resolve('./bin/p24-gen') + ' '
        + String(target)).toString().split(' ');
    results = [...results.map(e => e.trim()).filter(e => e != '')]
    return results;
}

function check24(input, nums)
{
    var tmp = input.slice(0);

    for (var i = 0; i < nums.length; ++i)
    {
        var s = String(nums[i]);
        var index = tmp.indexOf(s);
        if (index == -1) return false;
        tmp = tmp.slice(0, index)
            + tmp.slice(index + s.length, tmp.length);
    }

    var remain = tmp.split('').filter(e => '+-*/()'.indexOf(e) == -1);
    return remain.length == 0;
}

function eval24(input, target)
{
    try {
        return (Math.abs(evaluate(input) - target) < 1e-6);
    } catch {
        return false;
    }
}

module.exports =
{
    calc24,
    gen24,
    check24,
    eval24
};