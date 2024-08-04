document.addEventListener('DOMContentLoaded', function() {
    const profileButton = document.getElementById('profile-menu-button');
    const profileMenu = document.getElementById('profile-menu');
    const exploreButton = document.getElementById('explore-menu-button');
    const exploreMenu = document.getElementById('explore-menu');
    const searchIcon = document.querySelector('.search-icon');
    const searchContainer = document.querySelector('.search-container');
    const searchInput = document.getElementById('search-input');
    const animeCards = document.querySelectorAll('.anime-card');

    let timeout;

    // Función para alternar visibilidad de menús
    function toggleMenu(button, menu) {
        button.addEventListener('click', function() {
            menu.classList.toggle('hidden');
        });
    }

    // Función para manejar la entrada y salida del ratón
    function handleMouseEnterLeave(button, menu) {
        button.addEventListener('mouseenter', function() {
            clearTimeout(timeout);
            menu.classList.add('active');
        });

        button.addEventListener('mouseleave', function() {
            timeout = setTimeout(function() {
                menu.classList.remove('active');
            }, 200);
        });

        menu.addEventListener('mouseenter', function() {
            clearTimeout(timeout);
        });

        menu.addEventListener('mouseleave', function() {
            menu.classList.remove('active');
        });
    }

    // Verificar si los elementos existen antes de agregar eventos
    if (profileButton && profileMenu) {
        toggleMenu(profileButton, profileMenu);
    }

    if (exploreButton && exploreMenu) {
        handleMouseEnterLeave(exploreButton, exploreMenu);
    }

    if (searchIcon && searchContainer && searchInput) {
        searchIcon.addEventListener('click', function() {
            this.classList.add('active');
            setTimeout(() => {
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
    }

    // Cerrar menús al hacer clic fuera de ellos
    document.addEventListener('click', function(event) {
        if (profileMenu && !profileButton.contains(event.target) && !profileMenu.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
        if (exploreMenu && !exploreButton.contains(event.target) && !exploreMenu.contains(event.target)) {
            exploreMenu.classList.remove('active');
        }
    });

    // Accesibilidad: cerrar menús con la tecla Esc
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (profileMenu) profileMenu.classList.add('hidden');
            if (exploreMenu) exploreMenu.classList.remove('active');
            if (searchContainer) searchContainer.classList.remove('active');
        }
    });

    // Función de búsqueda de anime
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = searchInput.value.toLowerCase();
            animeCards.forEach(card => {
                const animeName = card.querySelector('h2').textContent.toLowerCase();
                if (animeName.includes(query)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
});
