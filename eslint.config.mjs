import nextConfig from "eslint-config-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const eslintConfig = [
  ...nextConfig,
  {
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // setState inside useEffect is normal React — react-hooks v6 is too strict here
      "react-hooks/set-state-in-effect": "off",
      // Hold the line on `any` while legacy usages are typed incrementally
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
