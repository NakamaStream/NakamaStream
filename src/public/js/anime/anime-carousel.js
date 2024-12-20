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

    // Variables para el carrusel de "Animes mejor calificados"
    const topRatedCarousel = document.getElementById('anime-scroll');
    const prevBtnTopRated = document.getElementById('prevBtnTopRated');
    const nextBtnTopRated = document.getElementById('nextBtnTopRated');
    let currentPositionTopRated = 0;

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

    // Lógica para los botones y carrusel de "Animes mejor calificados"
    prevBtnTopRated.addEventListener('click', () => {
        currentPositionTopRated = moveCarousel(topRatedCarousel, 'prev', currentPositionTopRated);
        updateButtonVisibility(topRatedCarousel, prevBtnTopRated, nextBtnTopRated, currentPositionTopRated);
    });

    nextBtnTopRated.addEventListener('click', () => {
        currentPositionTopRated = moveCarousel(topRatedCarousel, 'next', currentPositionTopRated);
        updateButtonVisibility(topRatedCarousel, prevBtnTopRated, nextBtnTopRated, currentPositionTopRated);
    });

    // Inicializar la visibilidad de los botones
    updateButtonVisibility(carousel, prevBtn, nextBtn, currentPosition);
    updateButtonVisibility(recentCarousel, prevBtnRecent, nextBtnRecent, currentPositionRecent);
    updateButtonVisibility(topRatedCarousel, prevBtnTopRated, nextBtnTopRated, currentPositionTopRated);

    // Manejar cambios de tamaño de ventana
    window.addEventListener('resize', () => {
        currentPosition = 0;
        currentPositionRecent = 0;
        currentPositionTopRated = 0;
        updateCarouselPosition(carousel, currentPosition);
        updateCarouselPosition(recentCarousel, currentPositionRecent);
        updateCarouselPosition(topRatedCarousel, currentPositionTopRated);
        updateButtonVisibility(carousel, prevBtn, nextBtn, currentPosition);
        updateButtonVisibility(recentCarousel, prevBtnRecent, nextBtnRecent, currentPositionRecent);
        updateButtonVisibility(topRatedCarousel, prevBtnTopRated, nextBtnTopRated, currentPositionTopRated);
    });
});

// Carousel de las categorias

class SmoothDragScroll {
    constructor(element) {
        this.element = element;
        this.mouseDown = false;
        this.startX = 0;
        this.scrollLeft = 0;
        this.momentum = { x: 0, y: 0 };
        this.rafId = null;
        this.lastTime = null;
        this.lastPageX = 0;

        this.init();
    }

    init() {
        this.addEventListeners();
        this.update();
    }

    addEventListeners() {
        this.element.addEventListener('mousedown', this.onMouseDown);
        this.element.addEventListener('mouseleave', this.onMouseLeave);
        this.element.addEventListener('mouseup', this.onMouseUp);
        this.element.addEventListener('mousemove', this.onMouseMove);

        this.element.addEventListener('touchstart', this.onTouchStart);
        this.element.addEventListener('touchend', this.onTouchEnd);
        this.element.addEventListener('touchmove', this.onTouchMove);

        this.element.addEventListener('click', this.onClick, true);
    }

    onMouseDown = (e) => {
        this.mouseDown = true;
        this.element.classList.add('dragging');
        this.startX = e.pageX - this.element.offsetLeft;
        this.scrollLeft = this.element.scrollLeft;
        this.lastPageX = e.pageX;
        this.lastTime = performance.now();
        this.cancelMomentumTracking();
    }

    onMouseLeave = () => {
        this.mouseDown = false;
        this.element.classList.remove('dragging');
    }

    onMouseUp = () => {
        this.mouseDown = false;
        this.element.classList.remove('dragging');
        this.beginMomentumTracking();
    }

    onMouseMove = (e) => {
        if (!this.mouseDown) return;
        e.preventDefault();
        const x = e.pageX - this.element.offsetLeft;
        const walk = (x - this.startX) * 2;
        this.element.scrollLeft = this.scrollLeft - walk;

        const currentTime = performance.now();
        const dt = currentTime - this.lastTime;
        const dx = e.pageX - this.lastPageX;

        this.momentum.x = dx / dt;

        this.lastTime = currentTime;
        this.lastPageX = e.pageX;
    }

    onTouchStart = (e) => {
        const touch = e.touches[0];
        this.onMouseDown(touch);
    }

    onTouchEnd = () => {
        this.onMouseUp();
    }

    onTouchMove = (e) => {
        const touch = e.touches[0];
        this.onMouseMove(touch);
    }

    onClick = (e) => {
        if (this.element.classList.contains('dragging')) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    beginMomentumTracking = () => {
        this.cancelMomentumTracking();
        this.rafId = requestAnimationFrame(this.momentumLoop);
    }

    cancelMomentumTracking = () => {
        cancelAnimationFrame(this.rafId);
    }

    momentumLoop = () => {
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;

        this.element.scrollLeft += this.momentum.x * elapsed;

        this.momentum.x *= Math.pow(0.95, elapsed / 16);

        if (Math.abs(this.momentum.x) > 0.01) {
            this.rafId = requestAnimationFrame(this.momentumLoop);
        }

        this.lastTime = currentTime;
    }

    update = () => {
        if (!this.mouseDown) {
            this.element.scrollLeft += this.momentum.x;
            this.momentum.x *= 0.95;
        }

        requestAnimationFrame(this.update);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const carousels = document.querySelectorAll('[data-drag-scroll]');
    carousels.forEach(carousel => new SmoothDragScroll(carousel));
});
