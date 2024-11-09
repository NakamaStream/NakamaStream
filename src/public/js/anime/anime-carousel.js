document.addEventListener('DOMContentLoaded', () => {
    // Variables para el carrusel de "Animes en emisión"
    const carousel = document.getElementById('anime-carousel');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const itemWidth = 256; // 256px (w-64)
    let currentPosition = 0;

    // Variables para el carrusel de "Animes recientes"
    const recentCarousel = document.getElementById('recent-anime-carousel');
    const prevBtnRecent = document.getElementById('prevBtnRecent');
    const nextBtnRecent = document.getElementById('nextBtnRecent');
    let currentPositionRecent = 0;

    function updateCarouselPosition(carousel, position) {
        carousel.style.transform = `translateX(${position}px)`;
    }

    function updateButtonVisibility(carousel, prevBtn, nextBtn, position) {
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        prevBtn.style.display = position < 0 ? 'flex' : 'none';
        nextBtn.style.display = Math.abs(position) < maxScroll ? 'flex' : 'none';
    }

    function moveCarousel(carousel, direction, position) {
        const containerWidth = carousel.parentElement.clientWidth;
        const scrollAmount = Math.floor(containerWidth / itemWidth) * itemWidth;
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;

        if (direction === 'next') {
            position = Math.max(position - scrollAmount, -maxScroll);
        } else {
            position = Math.min(position + scrollAmount, 0);
        }

        updateCarouselPosition(carousel, position);
        return position;
    }

    // Lógica para los botones y carrusel de "Animes en emisión"
    prevBtn.addEventListener('click', () => {
        currentPosition = moveCarousel(carousel, 'prev', currentPosition);
        updateButtonVisibility(carousel, prevBtn, nextBtn, currentPosition);
    });

    nextBtn.addEventListener('click', () => {
        currentPosition = moveCarousel(carousel, 'next', currentPosition);
        updateButtonVisibility(carousel, prevBtn, nextBtn, currentPosition);
    });

    // Lógica para los botones y carrusel de "Animes recientes"
    prevBtnRecent.addEventListener('click', () => {
        currentPositionRecent = moveCarousel(recentCarousel, 'prev', currentPositionRecent);
        updateButtonVisibility(recentCarousel, prevBtnRecent, nextBtnRecent, currentPositionRecent);
    });

    nextBtnRecent.addEventListener('click', () => {
        currentPositionRecent = moveCarousel(recentCarousel, 'next', currentPositionRecent);
        updateButtonVisibility(recentCarousel, prevBtnRecent, nextBtnRecent, currentPositionRecent);
    });

    // Inicializar la visibilidad de los botones
    updateButtonVisibility(carousel, prevBtn, nextBtn, currentPosition);
    updateButtonVisibility(recentCarousel, prevBtnRecent, nextBtnRecent, currentPositionRecent);

    // Manejar cambios de tamaño de ventana
    window.addEventListener('resize', () => {
        currentPosition = 0;
        currentPositionRecent = 0;
        updateCarouselPosition(carousel, currentPosition);
        updateCarouselPosition(recentCarousel, currentPositionRecent);
        updateButtonVisibility(carousel, prevBtn, nextBtn, currentPosition);
        updateButtonVisibility(recentCarousel, prevBtnRecent, nextBtnRecent, currentPositionRecent);
    });
});
