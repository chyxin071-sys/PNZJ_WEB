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
        // 覆盖 tailwind 默认颜色为高级色调
        rose: {
          50: 'var(--color-rose-50)',
          100: 'var(--color-rose-100)',
          500: 'var(--color-rose-500)',
          600: 'var(--color-rose-600)',
          700: 'var(--color-rose-700)',
        },
        emerald: {
          50: 'var(--color-emerald-50)',
          100: 'var(--color-emerald-100)',
          500: 'var(--color-emerald-500)',
          600: 'var(--color-emerald-600)',
          700: 'var(--color-emerald-700)',
        },
        amber: {
          50: 'var(--color-amber-50)',
          100: 'var(--color-amber-100)',
          500: 'var(--color-amber-500)',
          600: 'var(--color-amber-600)',
          700: 'var(--color-amber-700)',
        },
        // 使用 CSS 变量支持多主题切换
        background: "var(--bg-color)",
        foreground: "var(--text-main)", 
        primary: {
          900: "var(--primary-900)",
          800: "var(--primary-800)",
          700: "var(--primary-700)",
          100: "var(--primary-100)",
          50: "var(--primary-50)",
        },
        zinc: {
          50: "var(--zinc-50)",
          400: "var(--zinc-400)",
          500: "var(--zinc-500)",
          600: "var(--zinc-600)",
          700: "var(--zinc-700)",
          900: "var(--zinc-900)",
        },
        // 莫兰迪点缀色 (保留)
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
