
    const lazyImages = document.querySelectorAll('img.lazy-load');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.getAttribute('data-src');
                img.classList.remove('lazy-load');
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '0px 0px 100px 0px' });

    lazyImages.forEach(img => {
        imageObserver.observe(img);
    });
