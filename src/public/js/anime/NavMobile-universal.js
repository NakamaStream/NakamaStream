// Evento para el menú de usuario
document.getElementById('user-menu-toggle').addEventListener('click', function() {
    const userMenu = document.getElementById('user-menu');
    const arrow = document.getElementById('user-menu-arrow');
    userMenu.classList.toggle('hidden');
    userMenu.classList.toggle('scale-100');
    arrow.classList.toggle('rotate-180'); // Rota la flecha al abrir/cerrar el menú
});

// Evento para el menú móvil
document.getElementById('mobile-menu-toggle').addEventListener('click', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuIcon = document.getElementById('mobile-menu-icon');

    // Cambia la visibilidad y la escala
    mobileMenu.classList.toggle('hidden');
    mobileMenu.classList.toggle('scale-100');
    mobileMenu.classList.toggle('opacity-0'); // Para el efecto de desvanecimiento
    mobileMenu.classList.toggle('opacity-100'); // Para el efecto de desvanecimiento

    // Rota el ícono del menú móvil
    mobileMenuIcon.classList.toggle('fa-bars'); // Cambia a ícono de cerrar
    mobileMenuIcon.classList.toggle('fa-times'); // Cambia a ícono de hamburguesa
    mobileMenuIcon.classList.toggle('transition-transform'); // Para el efecto de rotación
});

// Evento para el menú de usuario en móvil
document.getElementById('user-menu-toggle-mobile').addEventListener('click', function() {
    const userMenuMobile = document.getElementById('user-menu-mobile');
    const arrowMobile = document.getElementById('user-menu-arrow-mobile');
    userMenuMobile.classList.toggle('hidden');
    userMenuMobile.classList.toggle('scale-100');
    arrowMobile.classList.toggle('rotate-180'); // Rota la flecha al abrir/cerrar el menú
});