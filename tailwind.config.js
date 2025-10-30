/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./public/**/*.{html,js}"],
    theme: {
        extend: {
            fontFamily: {
                "press-start": ['"Press Start 2P"', "cursive"],
            },
            colors: {
                "custom-dark": "#2e2e2e",
                "custom-light": "#ffffff",
            },
            boxShadow: {
                glow: "0 0 20px #ffffff",
            },
            borderWidth: {
                5: "5px",
            },
        },
    },
    plugins: [
        function ({ addUtilities, theme }) {
            const newUtilities = {
                ".text-shadow": {
                    textShadow: "2px 2px #000000",
                },
                ".text-shadow-lg": {
                    textShadow: "3px 3px #000000",
                },
            };
            addUtilities(newUtilities);
        },
    ],
};
