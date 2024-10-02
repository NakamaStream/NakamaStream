document.addEventListener('DOMContentLoaded', () => {

    const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

    if ($navbarBurgers.length > 0) {

        $navbarBurgers.forEach( el => {
            el.addEventListener('click', () => {

                const target = el.dataset.target;
                const $target = document.getElementById(target);

                el.classList.toggle('is-active');
                $target.classList.toggle('is-active');

            });
        });
    }
})

$(document).ready(function() {
    // Función para cargar los animes recientes
    function loadRecentAnimes() {
        $.ajax({
            url: '/api/recent-animes', // Reemplaza con el endpoint de tu API
            method: 'GET',
            success: function(data) {
                const animesContainer = $('#recent-animes');
                animesContainer.empty();

                data.forEach(anime => {
                    const animeElement = `
                        <div class="anime-box box">
                            <figure class="image">
                                <img src="${anime.imageUrl}" alt="${anime.name}">
                            </figure>
                            <h3 class="anime-title is-size-6">${anime.name}</h3>
                        </div>
                    `;
                    animesContainer.append(animeElement);
                });
            },
            error: function(err) {
                console.error('Error al cargar los animes recientes:', err);
            }
        });
    }

    // Llamar a la función para cargar los animes recientes
    loadRecentAnimes();
});