// 1. Find all our sidebar radio buttons
const sidebarTabs = document.querySelectorAll('.btn-check');
const mainContent = document.getElementById('main-content');
const settingContent = document.getElementById('setting-content');
// 2. Loop through them and attach an event listener to each
sidebarTabs.forEach(tab => {
    tab.addEventListener('change', (event) => {
        const clickedEl = event.target;
        
        // We will check by ID instead of name (explained below)
        if (clickedEl.id === 'Install-check') { 
            mainContent.style.display = 'block'; 
        } else {
            mainContent.style.display = 'none'; 
        }
        if (clickedEl.id === 'Settings-check') { 
            settingContent.style.display = 'block'; 
        } else {
            settingContent.style.display = 'none'; 
        }
    });
});