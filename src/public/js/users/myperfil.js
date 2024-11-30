document.addEventListener("DOMContentLoaded", () => {
  // Variables para Cropper.js
  let profileCropper;
  let bannerCropper;

  // Configuración de validación de archivos
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Función de validación de archivos
  function validateFile(file) {
    if (!file) return { valid: false, error: 'No se seleccionó ningún archivo' };
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Tipo de archivo no permitido. Solo se permiten imágenes JPG, PNG y GIF' 
      };
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: 'El archivo es demasiado grande. Máximo 5MB permitido' 
      };
    }
    
    return { valid: true };
  }

  // Manejo del cambio de imagen de perfil
  document
    .getElementById("profileImageInput")
    .addEventListener("change", function (event) {
      const file = event.target.files[0];
      const validation = validateFile(file);
      
      if (!validation.valid) {
        alert(validation.error);
        this.value = ''; // Limpiar input
        return;
      }

      if (file) {
        const imageUrl = URL.createObjectURL(file);
        const imageElement = document.getElementById("profileImage");
        imageElement.src = imageUrl;
        imageElement.classList.remove("hidden");
        document.getElementById("cropProfileImage").classList.remove("hidden");

        // Iniciar Cropper.js
        if (profileCropper) {
          profileCropper.destroy(); // Destruir cropper anterior si existe
        }
        profileCropper = new Cropper(imageElement, {
          aspectRatio: 1, // Proporción de 1:1 para la imagen de perfil
          viewMode: 1,
          minCropBoxWidth: 100,
          minCropBoxHeight: 100,
          maxCropBoxWidth: 800,
          maxCropBoxHeight: 800,
          responsive: true,
          checkOrientation: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false
        });
      }
    });

  document
    .getElementById("cropProfileImage")
    .addEventListener("click", function () {
      if (profileCropper) {
        const croppedCanvas = profileCropper.getCroppedCanvas();
        croppedCanvas.toBlob((blob) => {
          const formData = new FormData();
          blob.name = "profileImage";
          formData.append("profileImage", blob);
          submitFormWithFile(formData, "/profile/update-profile-image");
        });
      }
    });

  // Manejo del cambio de imagen de banner
  document
    .getElementById("bannerImageInput")
    .addEventListener("change", function (event) {
      const file = event.target.files[0];
      const validation = validateFile(file);
      
      if (!validation.valid) {
        alert(validation.error);
        this.value = ''; // Limpiar input
        return;
      }

      if (file) {
        const imageUrl = URL.createObjectURL(file);
        const imageElement = document.getElementById("bannerImage");
        imageElement.src = imageUrl;
        imageElement.classList.remove("hidden");
        document.getElementById("cropBannerImage").classList.remove("hidden");

        // Iniciar Cropper.js
        if (bannerCropper) {
          bannerCropper.destroy(); // Destruir cropper anterior si existe
        }
        bannerCropper = new Cropper(imageElement, {
          aspectRatio: 16 / 9, // Proporción de 16:9 para la imagen de banner
          viewMode: 1,
          minCropBoxWidth: 320,
          minCropBoxHeight: 180,
          maxCropBoxWidth: 1920,
          maxCropBoxHeight: 1080,
          responsive: true,
          checkOrientation: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false
        });
      }
    });

  document
    .getElementById("cropBannerImage")
    .addEventListener("click", function () {
      if (bannerCropper) {
        const croppedCanvas = bannerCropper.getCroppedCanvas();
        croppedCanvas.toBlob((blob) => {
          const formData = new FormData();
          blob.name = "bannerImage";
          formData.append("bannerImage", blob);
          submitFormWithFile(formData, "/profile/update-banner-image");
        });
      }
    });

  fetch("/api/watched-animes")
    .then((response) => response.json())
    .then((animes) => {
      const watchedAnimeList = document.getElementById("watchedAnimeList");
      watchedAnimeList.innerHTML = ""; // Limpiar contenido existente
      if (animes.length === 0) {
        watchedAnimeList.innerHTML =
          '<li class="text-center">No has visto ningún anime aún.</li>';
      } else {
        const animesPerPage = 6;
        const totalPages = Math.ceil(animes.length / animesPerPage);
        let currentPage = 1;

        function displayAnimes(page) {
          const start = (page - 1) * animesPerPage;
          const end = start + animesPerPage;
          const pageAnimes = animes.slice(start, end);

          watchedAnimeList.innerHTML = ""; // Limpiar lista actual

          pageAnimes.forEach((watchedAnime, index) => {
            const li = document.createElement("li");
            li.className =
              "flex items-center space-x-4 bg-gray-100 p-3 rounded-lg transition-all duration-300 hover:bg-gray-200";
            li.innerHTML = `
            <img src="${watchedAnime.imageUrl}" alt="${watchedAnime.name}" class="w-12 h-12 rounded-full object-cover">
            <div class="flex-grow">
                <a href="/anime/${watchedAnime.slug}/episode/${watchedAnime.episode_id}" class="hover:text-purple-600 transition-colors duration-300">
                  ${watchedAnime.name} - ${watchedAnime.episode_title}
                </a>
                <p class="text-sm text-gray-500">Visto el: ${new Date(watchedAnime.watched_at).toLocaleDateString()}</p>
            </div>
            <button class="delete-btn text-red-500 hover:text-red-700 transition-colors duration-300" data-anime-id="${watchedAnime.id}">Eliminar</button>
          `;
            watchedAnimeList.appendChild(li);

            // Animar elementos de la lista
            anime({
              targets: li,
              opacity: [0, 1],
              translateY: [20, 0],
              delay: index * 100,
              easing: "easeOutExpo",
            });

            // Agregar funcionalidad de eliminar al botón
            const deleteBtn = li.querySelector(".delete-btn");
            deleteBtn.addEventListener("click", () => {
              const animeId = deleteBtn.getAttribute("data-anime-id");
              if (confirm("¿Seguro que quieres eliminar este anime del historial?")) {
                fetch(`/api/watched-animes/${animeId}`, {
                  method: "DELETE",
                })
                  .then((response) => response.json())
                  .then((data) => {
                    if (data.message) {
                      alert(data.message);
                      li.remove(); // Eliminar el elemento de la lista en el frontend
                    }
                  })
                  .catch((error) => {
                    console.error("Error al eliminar el anime:", error);
                    alert("Hubo un error al intentar eliminar el anime.");
                  });
              }
            });
          });

          // Crear paginación
          const paginationContainer = document.createElement("div");
          paginationContainer.className = "flex justify-center mt-4 space-x-2";
          for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement("button");
            pageButton.textContent = i;
            pageButton.className = `px-3 py-1 rounded ${i === currentPage ? "active-page" : "inactive-page"
              }`;
            pageButton.addEventListener("click", () => {
              currentPage = i;
              displayAnimes(currentPage);
            });
            paginationContainer.appendChild(pageButton);
          }
          watchedAnimeList.appendChild(paginationContainer);
        }

        // Agregar estilos CSS para los botones de paginación
        const style = document.createElement('style');
        style.textContent = `
        .active-page {
          background-color: #ff6b6b;
          color: white;
        }
        .inactive-page {
          background-color: #e0e0e0;
          color: #333;
        }
      `;
        document.head.appendChild(style);

        displayAnimes(currentPage);
      }
    })
    .catch((error) => {
      console.error("Error al obtener animes vistos:", error);
      document.getElementById("watchedAnimeList").innerHTML =
        '<li class="text-center text-red-500">Error al cargar el historial de animes vistos.</li>';
    });


  // Fetch and display favorite animes
  fetch("/api/favorite-animes")
    .then((response) => response.json())
    .then((animes) => {
      const favoriteAnimeList = document.getElementById("favoriteAnimeList");
      favoriteAnimeList.innerHTML = ""; // Clear existing content
      if (animes.length === 0) {
        favoriteAnimeList.innerHTML =
          '<li class="text-center">No tienes animes favoritos aún.</li>';
      } else {
        animes.forEach((favoriteAnime, index) => {
          const li = document.createElement("li");
          li.className =
            "flex items-center space-x-4 bg-gray-100 p-3 rounded-lg transition-all duration-300 hover:bg-gray-200";
          li.innerHTML = `
                        <img src="${favoriteAnime.imageUrl}" alt="${favoriteAnime.name}" class="w-12 h-12 rounded-full object-cover">
                        <a href="/anime/${favoriteAnime.slug}" class="hover:text-purple-600 transition-colors duration-300">${favoriteAnime.name}</a>
                    `;
          favoriteAnimeList.appendChild(li);

          // Animate list items
          anime({
            targets: li,
            opacity: [0, 1],
            translateY: [20, 0],
            delay: index * 100,
            easing: "easeOutExpo",
          });
        });
      }
    })
    .catch((error) => {
      console.error("Error fetching favorite animes:", error);
      document.getElementById("favoriteAnimeList").innerHTML =
        '<li class="text-center text-red-500">Error al cargar los animes favoritos.</li>';
    });

  // Add some animations to the anime cards
  anime({
    targets: ".anime-card",
    scale: [0.9, 1],
    opacity: [0, 1],
    delay: anime.stagger(200),
    duration: 1000,
    easing: "easeOutElastic(1, .5)",
  });

  // Handle form submissions
  document
    .getElementById("updateInfoForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      submitForm(this, "/profile/update-info");
    });

  document
    .getElementById("changePasswordForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const newPassword = document.getElementById("newPassword").value;
      const confirmNewPassword =
        document.getElementById("confirmNewPassword").value;

      if (newPassword !== confirmNewPassword) {
        alert("Las nuevas contraseñas no coinciden");
        return;
      }

      submitForm(this, "/profile/update-password");
    });

  function submitForm(form, url) {
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert(data.message);
          // Reload the page to reflect changes
          window.location.reload();
        } else {
          alert(data.error || "An error occurred");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("An error occurred while updating the profile");
      });
  }

  function submitFormWithFile(formData, url) {
    // Mostrar indicador de carga
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Subiendo imagen...';
    document.body.appendChild(loadingIndicator);

    // Determinar qué imagen se está procesando
    const isProfile = url.includes('profile-image');
    const imageElement = isProfile ? 
      document.getElementById('profileImage') : 
      document.getElementById('bannerImage');

    fetch(url, {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          // Limpiar recursos
          if (imageElement && imageElement.src) {
            URL.revokeObjectURL(imageElement.src);
          }
          
          // Destruir el cropper correspondiente
          if (isProfile && profileCropper) {
            profileCropper.destroy();
            profileCropper = null;
          } else if (!isProfile && bannerCropper) {
            bannerCropper.destroy();
            bannerCropper = null;
          }
          
          alert(data.message);
          window.location.reload();
        } else {
          throw new Error(data.error || "Error al actualizar la imagen");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert(`Error al actualizar la imagen: ${error.message}`);
      })
      .finally(() => {
        // Eliminar indicador de carga
        loadingIndicator.remove();
      });
  }
});
