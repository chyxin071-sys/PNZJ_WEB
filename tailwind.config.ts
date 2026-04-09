/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 极简风基础配色
        background: "#ffffff",
        foreground: "#111111", // 恢复为极简黑/深灰字，保证对比度
        primary: {
          900: "#8c7a6b", // 浓奶咖
          800: "#a39182", // 暖奶咖
          700: "#bba899", // 标准奶咖
          100: "#f0ebe1", // 浅奶咖背景
          50: "#f8f6f3",  // 极浅奶白背景
        },
        // 莫兰迪点缀色
        morandi: {
          blue: "#8696a7",
          green: "#9baba0",
          brown: "#b5a397",
          sand: "#d4c8be",
          gray: "#e5e5e5"
        }
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
