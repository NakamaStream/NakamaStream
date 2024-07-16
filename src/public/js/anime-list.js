document.addEventListener('DOMContentLoaded', function() {
    const profileButton = document.getElementById('profile-menu-button');
    const profileMenu = document.getElementById('profile-menu');
    const exploreButton = document.getElementById('explore-menu-button');
    const exploreMenu = document.getElementById('explore-menu');
    const searchIcon = document.querySelector('.search-icon');
    const searchContainer = document.querySelector('.search-container');
    const searchInput = document.getElementById('search-input');

    let timeout;

    profileButton.addEventListener('click', function() {
        profileMenu.classList.toggle('hidden');
    });

    exploreButton.addEventListener('mouseenter', function() {
        clearTimeout(timeout); // Limpiar cualquier temporizador pendiente
        exploreMenu.classList.add('active');
    });

    exploreButton.addEventListener('mouseleave', function() {
        timeout = setTimeout(function() {
            exploreMenu.classList.remove('active');
        }, 200); // Ajustar el tiempo de espera según sea necesario
    });

    exploreMenu.addEventListener('mouseenter', function() {
        clearTimeout(timeout); // Cancelar el cierre si el usuario vuelve a entrar al menú
    });

    exploreMenu.addEventListener('mouseleave', function() {
        exploreMenu.classList.remove('active');
    });

    searchIcon.addEventListener('click', function() {
        this.classList.add('active');
        setTimeout(function() {
            searchIcon.classList.remove('active');
        }, 500);
        searchContainer.classList.add('active');
    });

    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            searchContainer.querySelector('form').submit();
        }
    });

    document.addEventListener('click', function(event) {
        if (!searchContainer.contains(event.target) && !searchIcon.contains(event.target)) {
            searchContainer.classList.remove('active');
        }
    });
});