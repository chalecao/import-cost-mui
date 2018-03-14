//npm install rollup rollup-plugin-babel babel-core babel-preset-env --save-dev
import babel from 'rollup-plugin-babel'

export default [{
  input: 'src/index.js',
  output: {
    file: 'dist/src/index.js',
    format: 'cjs'
  },
  plugins: [
    babel({
      "presets": [
        [
          "env",
          {
            "modules": false
          }
        ],
        "stage-3"
      ]
    })
  ]
}]
