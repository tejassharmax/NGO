import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'js/app.js',
  output: {
    file: 'js/bundle.js',
    format: 'iife',
    name: 'ChildHealthApp'
  },
  plugins: [
    nodeResolve({
      browser: true
    }),
    commonjs()
  ]
};
