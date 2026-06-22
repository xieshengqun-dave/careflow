module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src",
            "@careflow/shared": "../../packages/shared/src/index.ts",
            "@careflow/database": "../../packages/database/src/index.ts",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
