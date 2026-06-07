const installTab = document.getElementById('Install-check');
const packageGrid = document.getElementById('package-grid');
const invoke = window.__TAURI__.core.invoke; 

// THE OPEN FOLDER BUTTON LOGIC
const openbutton = document.getElementById("openbutton");
openbutton.addEventListener("click", async function(event) {
    event.preventDefault(); 
    try {
        await invoke('open_studio_dir'); // Tell Rust to open it
    } catch (error) {
        alert("Could not open folder:\n" + error);
    }
});

// THE TAB REFRESH LOGIC
installTab.addEventListener('change', (e) => {
  if (e.target.checked) scanAndRenderFolders();
});

if (installTab.checked) scanAndRenderFolders();

async function scanAndRenderFolders() {
  packageGrid.innerHTML = '<div class="col"><p>Scanning directories...</p></div>';

  try {
    const validFolders = [];
    const folders = await invoke('scan_packages');

    for (const name of folders) {
      let imgUrl = "";
      try {
        const bytes = await invoke('read_thumb', { folderName: name });
        const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
        imgUrl = URL.createObjectURL(blob);
      } catch(e) {}

      validFolders.push({ name: name, imagePath: imgUrl });
    }

    if (validFolders.length === 0) {
      packageGrid.innerHTML = '<div class="col"><p>No packages found inside the folder.</p></div>';
      return;
    }

    // 1. Build the HTML string first
    let htmlBuffer = "";
    validFolders.forEach(folder => {
      htmlBuffer += `
        <div class="col">
          <div class="card h-100 bg-dark text-light border-secondary">
            <img src="${folder.imagePath}" class="card-img-top" alt="${folder.name}" onerror="this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22286%22%20height%3D%22180%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20286%20180%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23777%22%3E%3C%2Frect%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%23555%22%20dy%3D%22.3em%22%20text-anchor%3D%22middle%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E'">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title">${folder.name}</h5>
              <button class="btn btn-primary w-100 mt-auto apply-btn" data-folder="${folder.name}">Apply Shader</button>
            </div>
          </div>
        </div>
      `;
    });

    // 2. Inject it into the page
    packageGrid.innerHTML = htmlBuffer;

    // 3. Attach the Click Listeners
    const applyButtons = packageGrid.querySelectorAll('.apply-btn');
    applyButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Get the target folder name
            const targetFolder = e.target.getAttribute('data-folder');
            
            // UI Feedback: Show loading state
            const originalText = e.target.innerText;
            e.target.innerText = "Installing...";
            e.target.classList.replace('btn-primary', 'btn-warning');
            e.target.disabled = true;

            try {
                // Trigger the silent batch process in Rust
                const successMessage = await invoke('apply_package', { folderName: targetFolder });
                
                // Show success UI
                e.target.innerText = "Installed!";
                e.target.classList.replace('btn-warning', 'btn-success');
                alert(successMessage);
            } catch (error) {
                // Show error UI
                e.target.innerText = "Failed";
                e.target.classList.replace('btn-warning', 'btn-danger');
                alert("Installation Error:\n" + error);
            } finally {
                // Optional: Reset button after 3 seconds
                setTimeout(() => {
                    e.target.innerText = originalText;
                    e.target.classList.remove('btn-success', 'btn-danger');
                    e.target.classList.add('btn-primary');
                    e.target.disabled = false;
                }, 3000);
            }
        });
    });

  } catch (error) {
    let targetFolder = "Unknown Location";
    try {
        targetFolder = await invoke('get_packages_dir');
    } catch (e) {}

    packageGrid.innerHTML = `
      <div class="col-12 w-100">
        <div class="alert alert-warning text-dark" role="alert">
          <h4 class="alert-heading">Folder Missing</h4>
          <p>The <strong>packages</strong> directory could not be found next to the executable.</p>
          <hr>
          <p class="mb-0">Please ensure your portable folder looks like this:</p>
          <ul class="mt-2 mb-0">
            <li>📁 StudioMod (Main Folder)
              <ul>
                <li>📄 studiomod.exe</li>
                <li>📁 <strong>packages</strong> <em>(Create this here!)</em></li>
              </ul>
            </li>
          </ul>
          <p class="mt-3 mb-0 text-muted small"><strong>Expected Path:</strong> ${targetFolder}</p>
        </div>
      </div>`;
  }
}