import { FlatCompat } from "@eslint/eslintrc";
import { globalIgnores } from "eslint/config";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [...compat.extends("next/core-web-vitals", "next/typescript")];
const config = [
	globalIgnores([".next/**", "next-env.d.ts"]),
	...eslintConfig,
];

export default config;
