/* Tema del boceto de MoviRuta para Tailwind (CDN). Debe cargarse justo después de https://cdn.tailwindcss.com */
const F = ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'];
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'secondary': '#006c49', 'secondary-container': '#6cf8bb', 'on-surface-variant': '#3f4944',
                'on-secondary-container': '#00714d', 'surface-container-low': '#f2f4f6', 'primary-fixed': '#a6f2d1',
                'secondary-fixed': '#6ffbbe', 'inverse-primary': '#8bd6b6', 'on-primary-fixed': '#002116',
                'on-tertiary-fixed-variant': '#005137', 'surface-container': '#eceef0', 'tertiary-fixed-dim': '#68dba9',
                'outline': '#6f7973', 'tertiary-container': '#006042', 'primary-container': '#065f46', 'on-surface': '#191c1e',
                'surface-container-lowest': '#ffffff', 'surface': '#f7f9fb', 'error-container': '#ffdad6', 'surface-dim': '#d8dadc',
                'on-error': '#ffffff', 'tertiary': '#00462f', 'primary': '#004532', 'surface-container-high': '#e6e8ea',
                'inverse-on-surface': '#eff1f3', 'on-primary-container': '#8bd6b7', 'on-tertiary': '#ffffff', 'background': '#f7f9fb',
                'surface-bright': '#f7f9fb', 'on-primary-fixed-variant': '#00513b', 'on-tertiary-container': '#69ddaa',
                'surface-tint': '#1b6b51', 'on-secondary-fixed': '#002113', 'surface-container-highest': '#e0e3e5',
                'on-background': '#191c1e', 'on-secondary': '#ffffff', 'on-secondary-fixed-variant': '#005236',
                'on-error-container': '#93000a', 'inverse-surface': '#2d3133', 'on-primary': '#ffffff', 'outline-variant': '#bec9c2',
                'surface-variant': '#e0e3e5', 'on-tertiary-fixed': '#002114', 'tertiary-fixed': '#85f8c4', 'error': '#ba1a1a',
                'secondary-fixed-dim': '#4edea3', 'primary-fixed-dim': '#8bd6b6', 'aviso': '#b45309', 'aviso-container': '#fef3c7',
            },
            borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', full: '9999px' },
            spacing: {
                'margin': '1rem', 'space-md': '1rem', 'margin-tablet': '1.5rem', 'space-lg': '1.5rem', 'gutter-desktop': '1.5rem',
                'space-2xl': '3rem', 'space-xl': '2rem', 'space-xs': '0.25rem', 'space-sm': '0.5rem', 'gutter': '1rem', 'margin-desktop': '2.5rem',
            },
            fontFamily: {
                sans: F,
                'headline-md': F, 'headline-xl': F, 'headline-lg': F, 'body-sm': F,
                'headline-xl-mobile': F, 'body-lg': F, 'label-lg': F, 'headline-sm': F,
                'label-sm': F, 'label-md': F, 'body-md': F,
            },
            fontSize: {
                'headline-md': ['24px', { lineHeight: '30px', letterSpacing: '-0.01em', fontWeight: '600' }],
                'headline-xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em', fontWeight: '700' }],
                'headline-lg': ['30px', { lineHeight: '36px', letterSpacing: '-0.015em', fontWeight: '700' }],
                'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
                'headline-xl-mobile': ['32px', { lineHeight: '38px', letterSpacing: '-0.015em', fontWeight: '700' }],
                'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
                'label-lg': ['15px', { lineHeight: '20px', fontWeight: '600' }],
                'headline-sm': ['20px', { lineHeight: '26px', letterSpacing: '-0.005em', fontWeight: '600' }],
                'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.03em', fontWeight: '700' }],
                'label-md': ['13px', { lineHeight: '18px', letterSpacing: '0.01em', fontWeight: '600' }],
                'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
            },
            boxShadow: {
                'encabezado': '0 4px 20px -4px rgba(0,69,50,0.4)',
                'suave': '0 1px 2px 0 rgba(15,23,42,0.04)',
                'brillo': '0 0 0 3px rgba(108,248,187,.45), 0 12px 32px -8px rgba(0,69,50,.35)',
            },
        },
    },
};
