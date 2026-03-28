import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // setState inside useEffect is normal React — react-hooks v6 is too strict here
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
