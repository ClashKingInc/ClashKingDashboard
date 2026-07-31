import nextConfig from "eslint-config-next";

const eslintConfig = [
  {
    ignores: ["dist/**", ".vinext/**", ".wrangler/**", "worker-configuration.d.ts"],
  },
  ...nextConfig,
  {
    rules: {
      // setState inside useEffect is normal React — react-hooks v6 is too strict here
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
