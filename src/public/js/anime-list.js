document.addEventListener('DOMContentLoaded', function() {
    const profileButton = document.getElementById('profile-menu-button');
    const profileMenu = document.getElementById('profile-menu');
    const exploreButton = document.getElementById('explore-menu-button');
    const exploreMenu = document.getElementById('explore-menu');
    const searchContainer = document.querySelector('.search-container');

    const searchIcon = document.getElementById('search-icon');
    const searchInput = document.getElementById('anime-search');
    const searchSvg = document.getElementById('search-svg');
    const animeCards = document.querySelectorAll('.anime-card');
    const noResults = document.getElementById('no-results');
    const bannerContainer = document.querySelector('.container.mx-auto.px-4.py-4'); // Selecciona el contenedor del carrusel

    const prevButton = document.getElementById('prev-slide');
    const nextButton = document.getElementById('next-slide');
    const carouselItems = document.querySelector('.carousel-items');
    const totalItems = document.querySelectorAll('.carousel-item').length;
    let currentIndex = 0;
    let interval;

    let timeout;

    // Fetch announcements
    fetch('/get-announcement')
    .then(response => response.json())
    .then(data => {
        const modal = document.getElementById('announcement-modal');
        const message = document.getElementById('announcement-message');
        const closeBtn = document.getElementById('close-announcement');
        
        if (data.message) {
            if (!localStorage.getItem('announcementSeen')) {
                message.textContent = data.message;
                modal.classList.remove('hidden');
                
                closeBtn.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    localStorage.setItem('announcementSeen', 'true');
                });
            }
        } else {
            localStorage.removeItem('announcementSeen');
        }
    })
    .catch(error => console.error('Error fetching announcement:', error));

    // Toggle menu visibility
    function toggleMenu(button, menu) {
        button.addEventListener('click', function() {
            menu.classList.toggle('hidden');
        });
    }

    // Handle mouse enter/leave
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

    // Add events to menus
    if (profileButton && profileMenu) {
        toggleMenu(profileButton, profileMenu);
    }

    if (exploreButton && exploreMenu) {
        handleMouseEnterLeave(exploreButton, exploreMenu);
    }

    searchIcon.addEventListener('click', function () {
        searchInput.classList.toggle('hidden');
        searchInput.focus();

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

    // Filter anime cards
    searchInput.addEventListener('input', function () {
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

        if (hasResults) {
            noResults.classList.add('hidden');
        } else {
            noResults.classList.remove('hidden');
        }

        // Ocultar el banner si hay búsqueda activa
        if (query) {
            bannerContainer.classList.add('hidden');
        } else {
            bannerContainer.classList.remove('hidden');
        }
    });

    // Close menus on click outside
    document.addEventListener('click', function(event) {
        if (profileMenu && !profileButton.contains(event.target) && !profileMenu.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
        if (exploreMenu && !exploreButton.contains(event.target) && !exploreMenu.contains(event.target)) {
            exploreMenu.classList.remove('active');
        }
    });

    // Close menus on Esc key press
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (profileMenu) profileMenu.classList.add('hidden');
            if (exploreMenu) exploreMenu.classList.remove('active');
            if (searchContainer) searchContainer.classList.remove('active');
        }
    });

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
        interval = setInterval(nextSlide, 8000);
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

    startAutoSlide();
});
