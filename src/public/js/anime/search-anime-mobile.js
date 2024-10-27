function toggleClearButtonMobile() {
    const searchInput = document.getElementById('mobile-search-input');
    const clearButton = document.getElementById('mobile-clear-button');

    if (searchInput.value.trim() !== "") {
        clearButton.style.display = "block";
    } else {
        clearButton.style.display = "none";
    }
}

function clearSearchMobile() {
    const searchInput = document.getElementById('mobile-search-input');
    const clearButton = document.getElementById('mobile-clear-button');
    
    searchInput.value = ""; // Clear the input field
    clearButton.style.display = "none"; // Hide the clear button
}


function filterAnime() {
    const searchInput = document.getElementById('mobile-search-input').value.toLowerCase();
    const containers = document.querySelectorAll('.anime-container');

    containers.forEach(container => {
        const animeName = container.getAttribute('data-name').toLowerCase();
        const animeDescription = container.getAttribute('data-description').toLowerCase();

        // Mostrar el contenedor si el texto de búsqueda coincide con el nombre o la descripción
        if (animeName.includes(searchInput) || animeDescription.includes(searchInput)) {
            container.style.display = "block";
        } else {
            container.style.display = "none";
        }
    });
}
