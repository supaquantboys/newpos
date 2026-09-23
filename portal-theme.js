// Reuse the dashboard's saved appearance without changing business data.
(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    function applyPortalTheme() {
        let settings = {};
        try { settings = JSON.parse(localStorage.getItem('eggProData') || '{}')?.appSettings || {}; } catch {}
        const accent = ['blue', 'green', 'purple', 'gray'].includes(settings.accentColor) ? settings.accentColor : 'blue';
        document.documentElement.dataset.theme = accent;
        document.documentElement.classList.toggle('dark', settings.theme === 'dark' || (settings.theme === 'system' && media.matches));
    }
    applyPortalTheme();
    media.addEventListener('change', applyPortalTheme);
    window.addEventListener('storage', event => { if (event.key === 'eggProData' || event.key === null) applyPortalTheme(); });
})();
