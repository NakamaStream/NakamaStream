const searchInput = document.getElementById('search-input');
const clearButton = document.getElementById('clear-button');
const animeContainers = document.querySelectorAll('.anime-list a'); // Selecciona todos los contenedores de anime
const noResultsMessage = document.getElementById('no-results-message'); // Mensaje de no encontrado

function toggleClearButton() {
    // Muestra el botón de borrar solo si hay texto en el input
    clearButton.style.display = searchInput.value ? 'block' : 'none';
}

function clearSearch() {
    // Borra el texto en el input y oculta el botón de borrar
    searchInput.value = '';
    toggleClearButton();
    searchInput.focus(); // Regresa el foco al input
    showAllAnimes(); // Muestra todos los contenedores de anime
    noResultsMessage.classList.add('hidden'); // Oculta el mensaje de no resultados
}

function filterAnimes() {
    const query = searchInput.value.toLowerCase(); // Convierte el texto a minúsculas
    let found = false; // Variable para verificar si se encontró algún anime

    animeContainers.forEach(container => {
        const animeName = container.querySelector('h2').textContent.toLowerCase(); // Obtiene el nombre del anime
        if (animeName.includes(query)) {
            container.style.display = 'block'; // Muestra el contenedor si coincide
            found = true; // Cambia a true si se encuentra al menos un anime
        } else {
            container.style.display = 'none'; // Oculta el contenedor si no coincide
        }
    });

    // Muestra u oculta el mensaje de no resultados basado en la variable found
    if (!found) {
        noResultsMessage.classList.remove('hidden'); // Muestra el mensaje si no se encontró nada
    } else {
        noResultsMessage.classList.add('hidden'); // Oculta el mensaje si se encontró al menos un anime
    }
}

searchInput.addEventListener('input', () => {
    toggleClearButton();
    filterAnimes(); // Llama a la función de filtro cada vez que se escribe
});

function showAllAnimes() {
    animeContainers.forEach(container => {
        container.style.display = 'block'; // Muestra todos los contenedores de anime
    });
    noResultsMessage.classList.add('hidden'); // Oculta el mensaje de no resultados
}
