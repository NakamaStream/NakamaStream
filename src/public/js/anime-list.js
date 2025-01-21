document.addEventListener('DOMContentLoaded', function() {
    const profileButton = document.getElementById('profile-menu-button');
    const profileMenu = document.getElementById('profile-menu');
    const exploreButton = document.getElementById('explore-menu-button');
    const exploreMenu = document.getElementById('explore-menu');
    const searchContainer = document.querySelector('.search-container');
    const searchIcon = document.getElementById('search-icon');
    const searchInput = document.getElementById('anime-search');
    const searchSvg = document.getElementById('search-svg');
    const animeCards = document.querySelectorAll('.anime-list a'); // Selección actualizada
    const noResults = document.getElementById('no-results');
    const carouselContainer = document.getElementById('carousel-container');

    const prevButton = document.getElementById('prev-slide');
    const nextButton = document.getElementById('next-slide');
    const carouselItems = document.querySelector('.carousel-items');
    const totalItems = document.querySelectorAll('.carousel-item').length;
    let currentIndex = 0;
    let interval;

    let timeout;

    fetch('/get-announcement')
        .then(response => response.json())
        .then(data => {
            console.log('Received data:', data); // Verifica el formato del mensaje recibido

            const modal = document.getElementById('announcement-modal');
            const message = document.getElementById('announcement-message');
            const closeBtn = document.getElementById('close-announcement');
            
            if (!message) {
                console.error('Element with id "announcement-message" not found.');
                return;
            }

            if (data.message) {
                if (!localStorage.getItem('announcementSeen')) {
                    console.log('Markdown message:', data.message); // Verifica el contenido Markdown
                    message.innerHTML = marked.parse(data.message); // Convertir Markdown a HTML
                    modal.classList.remove('hidden');
                    
                    closeBtn.addEventListener('click', () => {
                        modal.classList.add('hidden');
                        localStorage.setItem('announcementSeen', 'true');
                    }, { once: true });
                }
            } else {
                localStorage.removeItem('announcementSeen');
            }
        })
        .catch(error => console.error('Error fetching announcement:', error));

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

    searchIcon.addEventListener('click', function () {
        searchInput.classList.toggle('hidden');
        searchInput.focus();  // Foco automático en el campo de búsqueda

        // Cambiar ícono de lupa a X y viceversa
        if (searchInput.classList.contains('hidden')) {
            searchSvg.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            `;
        } else {
            searchSvg.innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            `;
        }
    });

    // Función de búsqueda de anime
    searchInput.addEventListener('input', function() {
        const query = searchInput.value.toLowerCase();
        let hasResults = false;
        
        animeCards.forEach(card => {
            const animeName = card.querySelector('h2').textContent.toLowerCase();
            if (animeName.includes(query)) {
                card.style.display = 'block';
                hasResults = true;
            } else {
                card.style.display = 'none';
            }
        });

        // Manejo de la visibilidad del mensaje de "No hay resultados"
        if (noResults) {
            noResults.classList.toggle('hidden', hasResults);
        }

        // Ocultar el carousel-container siempre que se realice una búsqueda
        if (carouselContainer) {
            carouselContainer.classList.add('hidden');
        }
    });

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

    // Función de actualización del carrusel
    function updateCarousel() {
        carouselItems.style.transform = `translateX(-${currentIndex * 100}%)`;
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalItems;
        updateCarousel();
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + totalItems) % totalItems;
        updateCarousel();
    }

    function startAutoSlide() {
        interval = setInterval(nextSlide, 8000); // Cambia el banner cada 8 segundos
    }

    function stopAutoSlide() {
        clearInterval(interval);
    }

    prevButton.addEventListener('click', function () {
        stopAutoSlide();
        prevSlide();
        startAutoSlide();
    });

    nextButton.addEventListener('click', function () {
        stopAutoSlide();
        nextSlide();
        startAutoSlide();
    });

    // Inicializar el carrusel
    startAutoSlide();
});
