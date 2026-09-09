import path from 'path';
import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
export default {
  input: 'tests/browser/index.ts',
  output: {file:'tests/browser/bundle.js',format:'iife',sourcemap:false},
  plugins:[{name:'obsidian-fixture',resolveId(id){if(id==='obsidian')return path.resolve('tests/browser/obsidian.ts');}},
    typescript({compilerOptions:{sourceMap:false,inlineSourceMap:false,inlineSources:false}}),nodeResolve({browser:true}),commonjs()]
};
