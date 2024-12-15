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

    let timeout;

    // Verificar si la librería `marked` está cargada
    if (typeof marked === 'undefined') {
        console.error('Librería `marked` no está cargada.');
        return;
    }

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

    // Cerrar menús al hacer clic fuera de ellos
    document.addEventListener('click', function(event) {
        if (profileMenu && !profileButton.contains(event.target) && !profileMenu.contains(event.target)) {
            profileMenu.classList.add('hidden');
        }
        if (exploreMenu && !exploreButton.contains(event.target) && !exploreMenu.contains(event.target)) {
            exploreMenu.classList.remove('active');
        }
    });

});

 // Mostrar el botón cuando se desplaza hacia abajo
 window.onscroll = function() {
    const button = document.getElementById('back-to-top');
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
        button.classList.remove('hidden');
    } else {
        button.classList.add('hidden');
    }
};

// Función para volver al inicio
document.getElementById('back-to-top').onclick = function() {
    window.scrollTo({top: 0, behavior: 'smooth'});
};


// Modal de descargas de las apps

const downloadBtn = document.getElementById('downloadBtn');
const downloadModal = document.getElementById('downloadModal');
const closeModal = document.getElementById('closeModal');

downloadBtn.addEventListener('click', () => {
    downloadModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
    downloadModal.classList.add('hidden');
});
